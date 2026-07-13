import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../kernel';
import type { ToolExecutor, ToolRequest, ToolResponse, ToolSnapshot } from '../tools';
import { AIManager } from './AIManager';
import { AIProviderRegistry } from './AIProviderRegistry';
import type {
  AIContext,
  AIProvider,
  AIProviderHealth,
  AIRequest,
  AIResponse,
  AIStreamHandlers,
  ToolCall,
  ToolCallResult,
} from './types';
// `ToolDefinition` vem direto de `tools/types` (nao via `ai/types`, que so a
// IMPORTA - nao a reexporta - para popular `AIRequest.tools`; mesmo padrao
// direto-do-arquivo ja usado em `OllamaProvider.ts`).
import type { ToolDefinition } from '../tools/types';

/**
 * Testes da AI Layer: deteccao (Sprint 15.1) + execucao (Sprint 15.2) de Tool
 * Calls.
 *
 * Sprint 15.1 provou que o `AIManager` detecta e loga Tool Calls sem
 * executar nada. A partir da Sprint 15.2 ele EXECUTA cada uma
 * sequencialmente via `runTool()` (ja existente) e converte o resultado em
 * `ToolCallResult`. Estes testes cobrem: sucesso, falha isolada (sem
 * interromper as proximas), ordem estritamente sequencial, ausencia de
 * `toolExecutor`, e os casos sem Tool Calls (regressao da 15.1).
 */

// So para tipar `capabilities` do FakeProvider sem importar AICapability a toa.
type AICapabilityLike = 'chat';

class FakeProvider implements AIProvider {
  readonly id = 'fake';
  readonly name = 'Fake';
  readonly capabilities: readonly AICapabilityLike[] = ['chat'];

  constructor(private readonly toolCalls?: readonly ToolCall[]) {}

  supports(capability: string): boolean {
    return capability === 'chat';
  }

  async execute(request: AIRequest, _context: AIContext): Promise<AIResponse> {
    return {
      capability: request.capability,
      output: { echo: request.input },
      provider: this.id,
      finishedAt: Date.now(),
      toolCalls: this.toolCalls,
    };
  }

  health(): AIProviderHealth {
    return { ok: true };
  }
}

/**
 * Provider fake com streaming (Sprint 17) - `chunks` e enviado via `onDelta`
 * um a um (na ordem), depois `onDone` com a `AIResponse` dada. Se `failWith`
 * for informado, lanca no lugar de completar (simula erro do Provider).
 */
class FakeStreamingProvider implements AIProvider {
  readonly id = 'fake-stream';
  readonly name = 'FakeStream';
  readonly capabilities: readonly AICapabilityLike[] = ['chat'];

  constructor(
    private readonly chunks: readonly string[],
    private readonly finalResponse: AIResponse,
    private readonly failWith?: Error,
  ) {}

  supports(capability: string): boolean {
    return capability === 'chat';
  }

  async execute(request: AIRequest, _context: AIContext): Promise<AIResponse> {
    return { ...this.finalResponse, capability: request.capability };
  }

  async stream(_request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    for (const chunk of this.chunks) {
      if (context.signal?.aborted) {
        throw new DOMException('A operacao foi abortada.', 'AbortError');
      }
      handlers.onDelta(chunk);
    }
    if (this.failWith) throw this.failWith;
    handlers.onDone?.(this.finalResponse);
  }

  health(): AIProviderHealth {
    return { ok: true };
  }
}

/** Provider sem `stream` - so `execute()`, como um Provider "comum" que ainda nao suporta streaming. */
class FakeNonStreamingProvider implements AIProvider {
  readonly id = 'fake-no-stream';
  readonly name = 'FakeNoStream';
  readonly capabilities: readonly AICapabilityLike[] = ['chat'];

  supports(capability: string): boolean {
    return capability === 'chat';
  }

  async execute(request: AIRequest, _context: AIContext): Promise<AIResponse> {
    return { capability: request.capability, output: {}, provider: this.id, finishedAt: Date.now() };
  }

  health(): AIProviderHealth {
    return { ok: true };
  }
}

/**
 * Um `ToolExecutor` fake - roteia por `toolId` para um handler injetado pelo
 * teste. `toolDefinitions` (Sprint 20, opcional) e o que `definitions()`
 * devolve - default `[]`, como um `ToolManager` sem Tools registradas.
 */
class FakeToolExecutor implements ToolExecutor {
  readonly calls: ToolRequest[] = [];

  constructor(
    private readonly handlers: Record<string, (input: unknown) => Promise<unknown>>,
    private readonly toolDefinitions: readonly ToolDefinition[] = [],
  ) {}

  async execute<TInput = unknown, TOutput = unknown>(
    request: ToolRequest<TInput>,
  ): Promise<ToolResponse<TOutput>> {
    this.calls.push(request as ToolRequest);
    const startedAt = Date.now();
    const handler = this.handlers[request.toolId];
    if (!handler) {
      return {
        toolId: request.toolId,
        success: false,
        error: `Tool nao encontrada: ${request.toolId}`,
        startedAt,
        finishedAt: Date.now(),
      };
    }
    try {
      const output = (await handler(request.input)) as TOutput;
      return { toolId: request.toolId, success: true, output, startedAt, finishedAt: Date.now() };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      return { toolId: request.toolId, success: false, error: message, startedAt, finishedAt: Date.now() };
    }
  }

  has(toolId: string): boolean {
    return toolId in this.handlers;
  }

  list(): readonly ToolSnapshot[] {
    return [];
  }

  definitions(): readonly ToolDefinition[] {
    return this.toolDefinitions;
  }
}

/**
 * Um `ToolExecutor` minimo que NAO implementa `definitions()` - simula um
 * implementador antigo/parcial do contrato (o metodo e opcional). Usado para
 * provar que o `AIManager` trata a ausencia como `[]`, sem lancar.
 */
class ToolExecutorWithoutDefinitions implements ToolExecutor {
  async execute<TInput = unknown, TOutput = unknown>(
    request: ToolRequest<TInput>,
  ): Promise<ToolResponse<TOutput>> {
    return { toolId: request.toolId, success: true, startedAt: Date.now(), finishedAt: Date.now() };
  }

  has(): boolean {
    return false;
  }

  list(): readonly ToolSnapshot[] {
    return [];
  }
}

type ContinueConversationFn = (
  request: AIRequest,
  response: AIResponse,
  toolResults: readonly ToolCallResult[],
  context: AIContext,
) => Promise<AIResponse>;

interface FakeAgentProvider extends AIProvider {
  executeCalls: number;
  continueCalls: Array<{ request: AIRequest; response: AIResponse; toolResults: readonly ToolCallResult[] }>;
  /** Cada `AIRequest` recebida por `execute()`, na ordem - usado para inspecionar `request.tools` (Sprint 20). */
  receivedRequests: AIRequest[];
}

/**
 * Provider fake do Agent Loop (Sprint 19), montado por fabrica (nao por
 * `class`) de proposito: assim `continueConversation` so existe na
 * instancia quando `continueImpl` e dado - testa fielmente tanto "Provider
 * implementa" quanto "Provider NAO implementa" (contrato opcional, como
 * `stream`), sem depender da ordem de inicializacao de campos do TS.
 *
 * `execute()` sempre devolve as `toolCalls` dadas (undefined/[] simula "sem
 * Tool Calls"); quando presente, `continueConversation` delega a
 * `continueImpl` e registra cada chamada - usado para provar "Provider
 * chamado exatamente duas vezes" e "mesmo Provider reutilizado" (ambos os
 * metodos vivem no MESMO objeto).
 */
function createFakeAgentProvider(
  toolCalls: readonly ToolCall[] | undefined,
  continueImpl?: ContinueConversationFn,
  id = 'fake-agent',
): FakeAgentProvider {
  const provider: FakeAgentProvider = {
    id,
    name: 'FakeAgent',
    capabilities: ['chat'] as readonly AICapabilityLike[],
    executeCalls: 0,
    continueCalls: [],
    receivedRequests: [],
    supports(capability: string) {
      return capability === 'chat';
    },
    async execute(request: AIRequest, _context: AIContext): Promise<AIResponse> {
      provider.executeCalls++;
      provider.receivedRequests.push(request);
      return {
        capability: request.capability,
        output: { message: { role: 'assistant', content: '' } },
        provider: provider.id,
        finishedAt: Date.now(),
        toolCalls,
      };
    },
    health(): AIProviderHealth {
      return { ok: true };
    },
  };

  if (continueImpl) {
    provider.continueConversation = async (
      request: AIRequest,
      response: AIResponse,
      toolResults: readonly ToolCallResult[],
      context: AIContext,
    ): Promise<AIResponse> => {
      provider.continueCalls.push({ request, response, toolResults });
      return continueImpl(request, response, toolResults, context);
    };
  }

  return provider;
}

function findLog(logger: Logger, pattern: RegExp) {
  return logger.getEntries().find((entry) => pattern.test(entry.message));
}

/**
 * continueConversation trivial para os testes de execucao de Tool Calls
 * (Sprint 15.2) - eles testam a MECANICA de execucao (runTool, ordem,
 * falha isolada, logs), nao o Agent Loop em si (isso e coberto pelos testes
 * de Sprint 19 abaixo). Desde a Sprint 19, qualquer Provider que devolve
 * `toolCalls` precisa implementar `continueConversation` (senao o AIManager
 * lanca) - este stub so evita que a 2a rodada quebre esses testes mais
 * antigos, sem mudar o que eles verificam.
 */
async function stubContinue(): Promise<AIResponse> {
  return {
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'stub' } },
    provider: 'fake',
    finishedAt: Date.now(),
  };
}

test('Tool Call bem-sucedida - executa via runTool(), vira ToolCallResult{executed} e loga cada etapa', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  const toolCalls: ToolCall[] = [
    { id: 'call-1', toolId: 'filesystem', input: { operation: 'readFile', path: '/tmp/x.txt' } },
  ];
  registry.register(createFakeAgentProvider(toolCalls, stubContinue, 'fake'));

  const executor = new FakeToolExecutor({
    filesystem: async () => ({ operation: 'readFile', content: 'conteudo lido' }),
  });
  const aiManager = new AIManager({ registry, logger, toolExecutor: executor });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(response.toolCallResults?.length, 1);
  assert.deepEqual(response.toolCallResults?.[0], {
    call: toolCalls[0],
    status: 'executed',
    output: { operation: 'readFile', content: 'conteudo lido' },
  });

  // runTool() de fato chamou o Tool System com o toolId/input certos.
  assert.equal(executor.calls.length, 1);
  assert.equal(executor.calls[0].toolId, 'filesystem');
  assert.deepEqual(executor.calls[0].input, toolCalls[0].input);

  // Os 5 pontos de log exigidos pela Task 15.2.
  assert.ok(findLog(logger, /IA solicitou 1 Tool Call/), 'log: Tool solicitada (agregado)');
  assert.ok(findLog(logger, /Tool Call solicitada: filesystem/), 'log: Tool solicitada (por chamada)');
  assert.ok(findLog(logger, /início da execução/), 'log: início da execução');
  assert.ok(findLog(logger, /sucesso \(filesystem\)/), 'log: sucesso');
  assert.ok(findLog(logger, /fim da execução/), 'log: fim da execução');
});

test('Tool Call que falha - vira ToolCallResult{failed} com o erro, sem lancar para fora', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: { path: '/nao-existe' } }];
  registry.register(createFakeAgentProvider(toolCalls, stubContinue, 'fake'));

  const executor = new FakeToolExecutor({
    filesystem: async () => {
      throw new Error('ENOENT: arquivo nao encontrado');
    },
  });
  const aiManager = new AIManager({ registry, logger, toolExecutor: executor });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(response.toolCallResults?.length, 1);
  assert.equal(response.toolCallResults?.[0].status, 'failed');
  assert.match(response.toolCallResults?.[0].error ?? '', /ENOENT/);

  assert.ok(findLog(logger, /erro \(filesystem\)/), 'log: erro');
  assert.ok(findLog(logger, /fim da execução/), 'log: fim da execução mesmo em falha');
});

test('Multiplas Tool Calls - executam sequencialmente e uma falha nao impede as seguintes', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  const toolCalls: ToolCall[] = [
    { id: 'call-1', toolId: 'tool-a', input: {} },
    { id: 'call-2', toolId: 'tool-b', input: {} },
  ];
  registry.register(createFakeAgentProvider(toolCalls, stubContinue, 'fake'));

  const order: string[] = [];
  const executor = new FakeToolExecutor({
    'tool-a': async () => {
      order.push('a-start');
      throw new Error('tool-a falhou de proposito');
    },
    'tool-b': async () => {
      order.push('b-start');
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push('b-end');
      return { ok: true };
    },
  });
  const aiManager = new AIManager({ registry, logger, toolExecutor: executor });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(response.toolCallResults?.length, 2);
  assert.equal(response.toolCallResults?.[0].status, 'failed');
  assert.equal(response.toolCallResults?.[1].status, 'executed');
  // 'a' foi chamada e terminou (com erro) ANTES de 'b' comecar - sequencial.
  assert.deepEqual(order, ['a-start', 'b-start', 'b-end']);
  assert.deepEqual(
    executor.calls.map((c) => c.toolId),
    ['tool-a', 'tool-b'],
  );
});

test('Execucao e estritamente sequencial - a segunda so comeca depois que a primeira termina', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  const toolCalls: ToolCall[] = [
    { id: 'call-1', toolId: 'lenta', input: {} },
    { id: 'call-2', toolId: 'rapida', input: {} },
  ];
  registry.register(createFakeAgentProvider(toolCalls, stubContinue, 'fake'));

  const events: string[] = [];
  const executor = new FakeToolExecutor({
    lenta: async () => {
      events.push('lenta:start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      events.push('lenta:end');
      return { ok: true };
    },
    rapida: async () => {
      events.push('rapida:start');
      await new Promise((resolve) => setTimeout(resolve, 1));
      events.push('rapida:end');
      return { ok: true };
    },
  });
  const aiManager = new AIManager({ registry, logger, toolExecutor: executor });

  await aiManager.execute({ capability: 'chat', input: {} });

  // Se fosse paralelo, "rapida:start"/"rapida:end" apareceriam antes de
  // "lenta:end" (seu delay e bem menor). Sequencial: 'lenta' termina 100%
  // antes de 'rapida' sequer comecar.
  assert.deepEqual(events, ['lenta:start', 'lenta:end', 'rapida:start', 'rapida:end']);
});

test('Sem toolExecutor injetado - cada Tool Call vira failed com mensagem clara, sem lancar', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: {} }];
  registry.register(createFakeAgentProvider(toolCalls, stubContinue, 'fake'));

  // Sem `toolExecutor` - o Tool System nao esta disponivel.
  const aiManager = new AIManager({ registry, logger });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(response.toolCallResults?.length, 1);
  assert.equal(response.toolCallResults?.[0].status, 'failed');
  assert.match(response.toolCallResults?.[0].error ?? '', /Tool System indisponível/);
});

test('Resposta sem toolCalls - toolCallResults ausente, nenhum log, nenhuma execucao', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  registry.register(new FakeProvider(undefined));
  const executor = new FakeToolExecutor({});
  const aiManager = new AIManager({ registry, logger, toolExecutor: executor });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(response.toolCallResults, undefined);
  assert.equal(executor.calls.length, 0);
  assert.equal(findLog(logger, /Tool Call/i), undefined);
});

test('toolCalls vazio ([]) - toolCallResults ausente, nenhuma execucao (nada foi de fato pedido)', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  registry.register(new FakeProvider([]));
  const executor = new FakeToolExecutor({});
  const aiManager = new AIManager({ registry, logger, toolExecutor: executor });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.deepEqual(response.toolCalls, []);
  assert.equal(response.toolCallResults, undefined);
  assert.equal(executor.calls.length, 0);
});

/**
 * Testes do Agent Loop (Sprint 19): depois que `runToolCalls()` (Sprint
 * 15.2, testado acima) executa as Tool Calls, o `AIManager` deve chamar
 * `provider.continueConversation()` no MESMO Provider e devolver a resposta
 * final - sem executar as Tool Calls de novo, sem trocar de Provider, sem
 * uma segunda rodada mesmo que a resposta final tambem traga `toolCalls`.
 */

test('Resposta sem Tool Calls - continueConversation NAO e chamado, resposta do execute() e a final', async () => {
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(undefined, async () => {
    throw new Error('nao deveria ser chamado');
  });
  registry.register(provider);
  const aiManager = new AIManager({ registry });

  const response = await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(provider.executeCalls, 1);
  assert.equal(provider.continueCalls.length, 0);
  assert.equal(response.provider, 'fake-agent');
});

test('Uma Tool Call - Provider chamado exatamente duas vezes; resposta final vem de continueConversation()', async () => {
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: { path: '/x.txt' } }];
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(toolCalls, async (_request, _response, toolResults) => ({
    capability: 'chat',
    output: { message: { role: 'assistant', content: `Li o arquivo: ${toolResults[0]?.output}` } },
    provider: 'fake-agent',
    finishedAt: Date.now(),
  }));
  registry.register(provider);
  const executor = new FakeToolExecutor({ filesystem: async () => 'conteudo-x' });
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  const response = await aiManager.execute<{ message: { content: string } }>({
    capability: 'chat',
    input: { messages: [{ role: 'user', content: 'leia /x.txt' }] },
  });

  assert.equal(provider.executeCalls, 1);
  assert.equal(provider.continueCalls.length, 1);
  assert.equal(response.output.message.content, 'Li o arquivo: conteudo-x');
  // toolCallResults da 1a rodada nao se perdem na resposta final.
  assert.equal(response.toolCallResults?.length, 1);
  assert.equal(response.toolCallResults?.[0].status, 'executed');
});

test('Multiplas Tool Calls - todas executam antes de continueConversation(), que recebe os resultados na mesma ordem', async () => {
  const toolCalls: ToolCall[] = [
    { id: 'call-1', toolId: 'tool-a', input: {} },
    { id: 'call-2', toolId: 'tool-b', input: {} },
    { id: 'call-3', toolId: 'tool-c', input: {} },
  ];
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(toolCalls, async (_request, _response, _toolResults) => ({
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'ok' } },
    provider: 'fake-agent',
    finishedAt: Date.now(),
  }));
  registry.register(provider);
  const executor = new FakeToolExecutor({
    'tool-a': async () => 'a',
    'tool-b': async () => 'b',
    'tool-c': async () => 'c',
  });
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(provider.continueCalls.length, 1);
  const received = provider.continueCalls[0].toolResults;
  assert.deepEqual(
    received.map((r) => r.call.toolId),
    ['tool-a', 'tool-b', 'tool-c'],
  );
  assert.deepEqual(
    received.map((r) => r.output),
    ['a', 'b', 'c'],
  );
});

test('Tool Call com erro - status "failed" e enviado ao Provider mesmo assim, loop nao interrompe', async () => {
  const toolCalls: ToolCall[] = [
    { id: 'call-1', toolId: 'tool-a', input: {} },
    { id: 'call-2', toolId: 'tool-b', input: {} },
  ];
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(toolCalls, async (_request, _response, toolResults) => ({
    capability: 'chat',
    output: {
      message: {
        role: 'assistant',
        content: `status: ${toolResults.map((r) => r.status).join(',')}`,
      },
    },
    provider: 'fake-agent',
    finishedAt: Date.now(),
  }));
  registry.register(provider);
  const executor = new FakeToolExecutor({
    'tool-a': async () => {
      throw new Error('tool-a falhou');
    },
    'tool-b': async () => 'b-ok',
  });
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  const response = await aiManager.execute<{ message: { content: string } }>({
    capability: 'chat',
    input: {},
  });

  assert.equal(provider.continueCalls.length, 1);
  const received = provider.continueCalls[0].toolResults;
  assert.equal(received[0].status, 'failed');
  assert.match(received[0].error ?? '', /tool-a falhou/);
  assert.equal(received[1].status, 'executed');
  assert.equal(response.output.message.content, 'status: failed,executed');
});

test('Provider nao implementa continueConversation - AIManager lanca erro claro (nao devolve resposta incompleta)', async () => {
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: {} }];
  const registry = new AIProviderRegistry();
  // FakeProvider nunca implementa continueConversation - e exatamente o caso
  // que este teste verifica (Provider incompleto para o Agent Loop).
  registry.register(new FakeProvider(toolCalls));
  const executor = new FakeToolExecutor({ filesystem: async () => 'ok' });
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  await assert.rejects(
    () => aiManager.execute({ capability: 'chat', input: {} }),
    /não implementa continueConversation/,
  );
});

test('Erro na segunda chamada (continueConversation) propaga atraves de execute()', async () => {
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: {} }];
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(toolCalls, async () => {
    throw new Error('Ollama caiu na 2a chamada');
  });
  registry.register(provider);
  const executor = new FakeToolExecutor({ filesystem: async () => 'ok' });
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  await assert.rejects(
    () => aiManager.execute({ capability: 'chat', input: {} }),
    /Ollama caiu na 2a chamada/,
  );
  assert.equal(provider.executeCalls, 1);
  assert.equal(provider.continueCalls.length, 1);
});

test('Reutilizacao do mesmo Provider - execute() e continueConversation() rodam na mesma instancia, mesmo com outro Provider registrado', async () => {
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: {} }];
  const registry = new AIProviderRegistry();
  const agent = createFakeAgentProvider(toolCalls, async () => ({
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'final' } },
    provider: 'fake-agent',
    finishedAt: Date.now(),
  }));
  registry.register(agent);
  // Um segundo Provider registrado (para a mesma capacidade, id diferente)
  // NAO deve ser tocado - a resolucao acontece uma unica vez, no inicio de
  // execute(), e o MESMO Provider resolvido e reusado em continueConversation.
  const other = createFakeAgentProvider(
    undefined,
    async () => {
      throw new Error('nao deveria ser chamado - Provider errado');
    },
    'fake-agent-other',
  );
  registry.register(other);
  const executor = new FakeToolExecutor({ filesystem: async () => 'ok' });
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  const response = await aiManager.execute({
    capability: 'chat',
    input: {},
    options: { providerId: 'fake-agent' },
  });

  assert.equal(response.provider, 'fake-agent');
  assert.equal(agent.executeCalls, 1);
  assert.equal(agent.continueCalls.length, 1);
  assert.equal(other.executeCalls, 0);
  assert.equal(other.continueCalls.length, 0);
});

/**
 * Testes de streaming (Sprint 17): `AIManager.stream()` resolve o Provider
 * pela MESMA capacidade de `execute()`, repassa `handlers` tal como recebeu
 * (cada `onDelta`/`onDone` vem do Provider, sem transformacao), preserva
 * `AbortSignal` (via `context.signal`) e propaga erro do Provider - logando e
 * chamando `handlers.onError` antes de relancar (Provider-agnostico: nada
 * especifico de Ollama aqui).
 */

test('Streaming simples - um chunk chega via onDelta, onDone traz a resposta final', async () => {
  const registry = new AIProviderRegistry();
  const finalResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'Ola' } },
    provider: 'fake-stream',
    finishedAt: Date.now(),
  };
  registry.register(new FakeStreamingProvider(['Ola'], finalResponse));
  const aiManager = new AIManager({ registry });

  const deltas: string[] = [];
  let done: AIResponse | undefined;
  await aiManager.stream(
    { capability: 'chat', input: {} },
    { onDelta: (d) => deltas.push(d), onDone: (r) => (done = r) },
  );

  assert.deepEqual(deltas, ['Ola']);
  assert.equal(done?.output && (done.output as { message: { content: string } }).message.content, 'Ola');
});

test('Streaming com multiplos chunks - chegam via onDelta na ordem recebida do Provider', async () => {
  const registry = new AIProviderRegistry();
  const finalResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'Ola, como posso ajudar?' } },
    provider: 'fake-stream',
    finishedAt: Date.now(),
  };
  registry.register(new FakeStreamingProvider(['Ola', ', como', ' posso', ' ajudar?'], finalResponse));
  const aiManager = new AIManager({ registry });

  const deltas: string[] = [];
  await aiManager.stream({ capability: 'chat', input: {} }, { onDelta: (d) => deltas.push(d) });

  assert.deepEqual(deltas, ['Ola', ', como', ' posso', ' ajudar?']);
  assert.equal(deltas.join(''), 'Ola, como posso ajudar?');
});

test('Chunk vazio - onDelta e chamado com string vazia sem quebrar o streaming', async () => {
  const registry = new AIProviderRegistry();
  const finalResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'Oi' } },
    provider: 'fake-stream',
    finishedAt: Date.now(),
  };
  registry.register(new FakeStreamingProvider(['', 'Oi', ''], finalResponse));
  const aiManager = new AIManager({ registry });

  const deltas: string[] = [];
  let doneCalled = false;
  await aiManager.stream(
    { capability: 'chat', input: {} },
    { onDelta: (d) => deltas.push(d), onDone: () => (doneCalled = true) },
  );

  assert.deepEqual(deltas, ['', 'Oi', '']);
  assert.equal(doneCalled, true);
});

test('Conclusao correta - stream() resolve normalmente apos onDone, sem lancar', async () => {
  const registry = new AIProviderRegistry();
  const finalResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'Fim' } },
    provider: 'fake-stream',
    finishedAt: Date.now(),
  };
  registry.register(new FakeStreamingProvider(['Fim'], finalResponse));
  const aiManager = new AIManager({ registry });

  await assert.doesNotReject(() =>
    aiManager.stream({ capability: 'chat', input: {} }, { onDelta: () => {} }),
  );
});

test('Cancelamento - abortar o signal interrompe o streaming (AbortError propaga)', async () => {
  const registry = new AIProviderRegistry();
  const finalResponse: AIResponse = {
    capability: 'chat',
    output: {},
    provider: 'fake-stream',
    finishedAt: Date.now(),
  };
  // Muitos chunks - o teste aborta antes do Provider terminar de emiti-los.
  registry.register(new FakeStreamingProvider(Array(1000).fill('x'), finalResponse));
  const aiManager = new AIManager({ registry });

  const controller = new AbortController();
  let count = 0;
  const pending = aiManager.stream(
    { capability: 'chat', input: {} },
    {
      onDelta: () => {
        count++;
        if (count === 3) controller.abort();
      },
    },
    { signal: controller.signal },
  );

  await assert.rejects(pending, /AbortError|abortad/i);
  assert.ok(count >= 3, 'parou de emitir logo apos o abort (nao terminou os 1000 chunks)');
});

test('Erro do Provider - stream() rejeita, loga e chama handlers.onError', async () => {
  const logger = new Logger('test');
  const registry = new AIProviderRegistry();
  const finalResponse: AIResponse = {
    capability: 'chat',
    output: {},
    provider: 'fake-stream',
    finishedAt: Date.now(),
  };
  registry.register(
    new FakeStreamingProvider(['parcial'], finalResponse, new Error('Ollama: modelo sobrecarregado')),
  );
  const aiManager = new AIManager({ registry, logger });

  let onErrorMessage: string | undefined;
  await assert.rejects(
    () =>
      aiManager.stream(
        { capability: 'chat', input: {} },
        { onDelta: () => {}, onError: (message) => (onErrorMessage = message) },
      ),
    /sobrecarregado/,
  );

  assert.match(onErrorMessage ?? '', /sobrecarregado/);
  assert.ok(findLog(logger, /IA \(streaming\) falhou/), 'log: erro de streaming');
});

test('Provider sem suporte a streaming - stream() rejeita com mensagem clara', async () => {
  const registry = new AIProviderRegistry();
  registry.register(new FakeNonStreamingProvider());
  const aiManager = new AIManager({ registry });

  await assert.rejects(
    () => aiManager.stream({ capability: 'chat', input: {} }, { onDelta: () => {} }),
    /não suporta streaming/,
  );
});

/**
 * Testes de infraestrutura de Tool Definitions (Sprint 20): o `AIManager`
 * popula `request.tools` automaticamente a partir de `toolExecutor.definitions()`
 * ANTES de chamar `provider.execute()` - sem detectar/executar nenhuma Tool
 * Call por causa disso (isso continua sendo so o Agent Loop, inalterado).
 */

const FAKE_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Le e escreve arquivos.',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
];

test('AIManager injeta tools automaticamente - Provider recebe as ToolDefinition do toolExecutor', async () => {
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(undefined);
  registry.register(provider);
  const executor = new FakeToolExecutor({}, FAKE_TOOL_DEFINITIONS);
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(provider.receivedRequests.length, 1);
  assert.deepEqual(provider.receivedRequests[0].tools, FAKE_TOOL_DEFINITIONS);
});

test('Sem toolExecutor injetado - Provider recebe tools: [] (nunca undefined, nunca lanca)', async () => {
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(undefined);
  registry.register(provider);
  const aiManager = new AIManager({ registry });

  await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(provider.receivedRequests.length, 1);
  assert.deepEqual(provider.receivedRequests[0].tools, []);
});

test('toolExecutor sem definitions() (contrato opcional) - AIManager trata a ausencia como [], sem lancar', async () => {
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(undefined);
  registry.register(provider);
  const executor = new ToolExecutorWithoutDefinitions();
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  await aiManager.execute({ capability: 'chat', input: {} });

  assert.equal(provider.receivedRequests.length, 1);
  assert.deepEqual(provider.receivedRequests[0].tools, []);
});

test('request.tools ja informado explicitamente - AIManager respeita e nao sobrescreve com o toolExecutor', async () => {
  const registry = new AIProviderRegistry();
  const provider = createFakeAgentProvider(undefined);
  registry.register(provider);
  const executor = new FakeToolExecutor({}, FAKE_TOOL_DEFINITIONS);
  const aiManager = new AIManager({ registry, toolExecutor: executor });

  const curated: readonly ToolDefinition[] = [
    { id: 'custom', name: 'Custom', description: 'So esta.', parameters: { type: 'object' } },
  ];
  await aiManager.execute({ capability: 'chat', input: {}, tools: curated });

  assert.equal(provider.receivedRequests.length, 1);
  assert.deepEqual(provider.receivedRequests[0].tools, curated);
});
