import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIManager } from '../../AIManager';
import { AIProviderRegistry } from '../../AIProviderRegistry';
import type { AIContext, AIResponse, ToolCall, ToolCallResult } from '../../types';
// `ToolDefinition`/`ToolExecutor` vêm do barrel do Tool System (mesmo padrão
// já usado em `ai/AIManager.test.ts`) — não são conhecimento do Ollama.
import type { ToolDefinition, ToolExecutor } from '../../../tools';
import { OllamaProvider, createOllamaProvider } from './OllamaProvider';

/**
 * Testes do primeiro provedor real da AI Layer (Sprint 13).
 *
 * Nenhum teste aqui faz rede de verdade: o `fetch` é injetado (DI), então
 * cada caso simula exatamente a resposta HTTP do Ollama que quer exercitar.
 * Isso cobre tanto o caminho feliz quanto falhas (modelo inexistente, Ollama
 * offline) sem depender de um Ollama instalado na máquina que roda os testes.
 */

const BASE_URL = 'http://localhost:11434';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Fábrica de um `fetch` fake: roteia por path (`/api/chat`, `/api/tags`, `/api/show`). */
function fakeFetch(
  handlers: Partial<Record<'/api/chat' | '/api/tags' | '/api/show', (init?: RequestInit) => Response>>,
): typeof fetch {
  return (async (input: string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const path = url.replace(BASE_URL, '') as '/api/chat' | '/api/tags' | '/api/show';
    const handler = handlers[path];
    if (!handler) {
      throw new Error(`fakeFetch: nenhum handler configurado para ${path}`);
    }
    return handler(init);
  }) as typeof fetch;
}

/** Um `fetch` fake que sempre falha como uma conexão recusada (Ollama offline). */
function offlineFetch(): typeof fetch {
  return (async () => {
    throw new TypeError('fetch failed: ECONNREFUSED');
  }) as typeof fetch;
}

/**
 * Um `fetch` fake que devolve um corpo NDJSON em streaming de verdade (um
 * `ReadableStream`, lido via `getReader()` — o mesmo caminho que
 * `OllamaHttpClient.chatStream()` usa). Cada item de `lines` vira uma linha
 * JSON própria. Se `signal` for abortado antes do fim, o stream é encerrado
 * com erro (`AbortError`) — imita o comportamento real do `fetch`.
 */
function streamingFetch(lines: readonly unknown[], opts: { delayMs?: number } = {}): typeof fetch {
  return (async (_input: string | URL, init?: RequestInit) => {
    const signal = init?.signal as AbortSignal | undefined;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const line of lines) {
          if (signal?.aborted) {
            controller.error(new DOMException('A operação foi abortada.', 'AbortError'));
            return;
          }
          if (opts.delayMs) await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        }
        controller.close();
      },
    });
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
  }) as typeof fetch;
}

test('Provider registrado — AIProviderRegistry aceita e devolve o OllamaProvider', () => {
  const registry = new AIProviderRegistry();
  const provider = createOllamaProvider({ baseUrl: BASE_URL });

  registry.register(provider);

  assert.equal(registry.has('ollama'), true);
  assert.equal(registry.get('ollama'), provider);
  assert.deepEqual(
    registry.list().map((p) => p.id),
    ['ollama'],
  );
});

test('Provider descoberto pelo AIManager — execute() resolve via Registry sem conhecer Ollama', async () => {
  const registry = new AIProviderRegistry();
  const fetchImpl = fakeFetch({
    '/api/chat': () => jsonResponse({ message: { role: 'assistant', content: 'Oi, tudo bem?' } }),
  });
  registry.register(createOllamaProvider({ baseUrl: BASE_URL, fetchImpl }));

  // O AIManager só conhece o contrato AIProvider + o Registry — nada de Ollama.
  const aiManager = new AIManager({ registry });

  const response = await aiManager.execute({
    capability: 'chat',
    input: { messages: [{ role: 'user', content: 'oi' }] },
  });

  assert.equal(response.provider, 'ollama');
  assert.equal(response.capability, 'chat');
  assert.deepEqual(response.output, {
    message: { role: 'assistant', content: 'Oi, tudo bem?' },
  });
});

test('Chat funcionando — OllamaProvider.chat() devolve a mensagem do assistente', async () => {
  const fetchImpl = fakeFetch({
    '/api/chat': (init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; stream: boolean };
      assert.equal(body.stream, false);
      assert.equal(body.model, 'llama3.2');
      return jsonResponse({ message: { role: 'assistant', content: '  Olá!  ' } });
    },
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const reply = await provider.chat([{ role: 'user', content: 'oi' }]);

  assert.equal(reply.role, 'assistant');
  assert.equal(reply.content, 'Olá!'); // trim aplicado
});

test('Listagem de modelos — OllamaProvider.listModels() mapeia /api/tags', async () => {
  const fetchImpl = fakeFetch({
    '/api/tags': () =>
      jsonResponse({
        models: [
          { name: 'llama3.2', size: 123, modified_at: '2026-01-01' },
          { name: 'qwen2.5:3b', size: 456, modified_at: '2026-02-02' },
        ],
      }),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const models = await provider.listModels();

  assert.deepEqual(models, [
    { name: 'llama3.2', size: 123, modifiedAt: '2026-01-01' },
    { name: 'qwen2.5:3b', size: 456, modifiedAt: '2026-02-02' },
  ]);
});

test('Health — checkHealth() confirma o Ollama de pé e health() reflete o estado', async () => {
  const fetchImpl = fakeFetch({
    '/api/tags': () => jsonResponse({ models: [] }),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  // Otimista antes de qualquer chamada (mesma postura do BaseAIProvider).
  assert.deepEqual(provider.health(), { ok: true });

  const health = await provider.checkHealth();

  assert.deepEqual(health, { ok: true });
  assert.deepEqual(provider.health(), { ok: true });
});

test('Modelo inexistente — modelInfo() lança um erro claro (404 do Ollama)', async () => {
  const fetchImpl = fakeFetch({
    '/api/show': () => jsonResponse({ error: "model 'inexistente' not found" }, 404),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  await assert.rejects(() => provider.modelInfo('inexistente'), /404|não encontrado|not found/i);
});

test('Ollama offline — chat() lança um erro claro e health() reflete a falha', async () => {
  const provider: OllamaProvider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl: offlineFetch() });

  await assert.rejects(
    () => provider.chat([{ role: 'user', content: 'oi' }]),
    /Não foi possível conectar ao Ollama/,
  );

  const health = provider.health();
  assert.equal(health.ok, false);
  assert.match(health.detail ?? '', /ECONNREFUSED|conectar/i);
});

test('Ollama offline — AIManager.execute() propaga o erro (nenhum fallback silencioso)', async () => {
  const registry = new AIProviderRegistry();
  registry.register(createOllamaProvider({ baseUrl: BASE_URL, fetchImpl: offlineFetch() }));
  const aiManager = new AIManager({ registry });

  await assert.rejects(() =>
    aiManager.execute({ capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } }),
  );
});

/**
 * Testes de streaming (Sprint 17): `OllamaProvider.stream()` consome
 * `/api/chat` com `stream: true` (NDJSON real, via `ReadableStream`) e
 * repassa cada pedaço fielmente — nenhum outro componente do sistema conhece
 * este protocolo.
 */

test('Streaming — cada linha NDJSON vira um onDelta, na ordem; onDone traz a resposta completa', async () => {
  const fetchImpl = streamingFetch([
    { message: { role: 'assistant', content: 'Olá' }, done: false },
    { message: { role: 'assistant', content: ', tudo bem?' }, done: false },
    { message: { role: 'assistant', content: '' }, done: true },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const deltas: string[] = [];
  let done: { output: { message: { content: string } } } | undefined;
  await provider.stream(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    { onDelta: (d) => deltas.push(d), onDone: (r) => (done = r as typeof done) },
    { requestId: 'r1', capability: 'chat', startedAt: Date.now() },
  );

  assert.deepEqual(deltas, ['Olá', ', tudo bem?', '']);
  assert.equal(done?.output.message.content, 'Olá, tudo bem?');
});

test('Streaming — body enviado a /api/chat pede stream:true (não stream:false)', async () => {
  let sentBody: { stream?: boolean; model?: string } = {};
  const fetchImpl = (async (_input: string | URL, init?: RequestInit) => {
    sentBody = JSON.parse(String(init?.body)) as typeof sentBody;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ message: { content: 'oi' }, done: true })}\n`));
        controller.close();
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  await provider.stream(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    { onDelta: () => {} },
    { requestId: 'r1', capability: 'chat', startedAt: Date.now() },
  );

  assert.equal(sentBody.stream, true);
});

test('Chunk vazio — uma linha NDJSON com content vazio ainda chama onDelta("")', async () => {
  const fetchImpl = streamingFetch([
    { message: { role: 'assistant', content: '' }, done: false },
    { message: { role: 'assistant', content: 'Oi' }, done: true },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const deltas: string[] = [];
  await provider.stream(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    { onDelta: (d) => deltas.push(d) },
    { requestId: 'r1', capability: 'chat', startedAt: Date.now() },
  );

  assert.deepEqual(deltas, ['', 'Oi']);
});

test('Erro do Ollama em pleno streaming (linha com "error") — stream() lança e nenhum onDone é chamado', async () => {
  const fetchImpl = streamingFetch([
    { message: { role: 'assistant', content: 'Olá' }, done: false },
    { error: 'model runner crashed' },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  let doneCalled = false;
  await assert.rejects(
    () =>
      provider.stream(
        { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
        { onDelta: () => {}, onDone: () => (doneCalled = true) },
        { requestId: 'r1', capability: 'chat', startedAt: Date.now() },
      ),
    /model runner crashed/,
  );
  assert.equal(doneCalled, false);
});

test('Ollama offline — stream() lança o mesmo erro amigável que chat(), health() reflete a falha', async () => {
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl: offlineFetch() });

  await assert.rejects(
    () =>
      provider.stream(
        { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
        { onDelta: () => {} },
        { requestId: 'r1', capability: 'chat', startedAt: Date.now() },
      ),
    /Não foi possível conectar ao Ollama/,
  );
  assert.equal(provider.health().ok, false);
});

test('Cancelamento em pleno streaming — abortar o signal interrompe e propaga AbortError', async () => {
  const fetchImpl = streamingFetch(
    [
      { message: { role: 'assistant', content: 'a' }, done: false },
      { message: { role: 'assistant', content: 'b' }, done: false },
      { message: { role: 'assistant', content: 'c' }, done: false },
      { message: { role: 'assistant', content: 'd' }, done: true },
    ],
    { delayMs: 5 },
  );
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const controller = new AbortController();
  const deltas: string[] = [];
  const pending = provider.stream(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    {
      onDelta: (d) => {
        deltas.push(d);
        if (deltas.length === 2) controller.abort();
      },
    },
    { requestId: 'r1', capability: 'chat', startedAt: Date.now(), signal: controller.signal },
  );

  await assert.rejects(pending, /AbortError|abortad/i);
  assert.ok(deltas.length < 4, 'não recebeu todos os 4 chunks — foi interrompido antes');
});

test('AIManager.stream() com OllamaProvider — resolve por capacidade "chat" (mesma do execute), sem conhecer Ollama', async () => {
  const registry = new AIProviderRegistry();
  const fetchImpl = streamingFetch([{ message: { role: 'assistant', content: 'Oi!' }, done: true }]);
  registry.register(createOllamaProvider({ baseUrl: BASE_URL, fetchImpl }));
  const aiManager = new AIManager({ registry });

  const deltas: string[] = [];
  await aiManager.stream(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    { onDelta: (d) => deltas.push(d) },
  );

  assert.deepEqual(deltas, ['Oi!']);
});

/**
 * Testes do Agent Loop (Sprint 19): `OllamaProvider.continueConversation()`
 * é o ÚNICO lugar que sabe montar o formato de mensagens do Ollama para
 * continuar uma conversa após Tool Calls — reconstrói a mensagem `assistant`
 * que pediu as Tools (com `tool_calls`) e acrescenta uma mensagem `role:
 * 'tool'` por resultado, preservando callId/toolId/status/output/error, e
 * faz uma nova chamada a `/api/chat`.
 */

interface CapturedChatBody {
  model: string;
  messages: Array<{ role: string; content: string; tool_calls?: unknown }>;
  /** Presente só quando `request.tools` foi enviado (Sprint 21). */
  tools?: Array<{ type: string; function: { name: string; description: string; parameters: unknown } }>;
}

/** Fábrica de `fetch` fake para `/api/chat` que devolve respostas em sequência e captura cada corpo enviado. */
function chatFetchSequence(replies: readonly unknown[]): {
  fetchImpl: typeof fetch;
  requests: CapturedChatBody[];
} {
  const requests: CapturedChatBody[] = [];
  let call = 0;
  const fetchImpl = fakeFetch({
    '/api/chat': (init) => {
      const body = JSON.parse(String(init?.body)) as CapturedChatBody;
      requests.push(body);
      const reply = replies[Math.min(call, replies.length - 1)];
      call++;
      return jsonResponse(reply);
    },
  });
  return { fetchImpl, requests };
}

function baseContext(): AIContext {
  return { requestId: 'r1', capability: 'chat', startedAt: Date.now() };
}

test('continueConversation() — monta histórico + assistant(tool_calls) + tool results, na ordem, e devolve a resposta final', async () => {
  // Este teste chama continueConversation() DIRETAMENTE (sem passar por
  // execute() antes) — só UMA requisição HTTP acontece aqui, a da própria
  // continueConversation(); por isso só um reply é necessário.
  const { fetchImpl, requests } = chatFetchSequence([
    { message: { role: 'assistant', content: 'O arquivo diz: conteúdo-x' } },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: { path: '/x.txt' } }];
  const priorResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: 'Vou ler o arquivo.' } },
    provider: 'ollama',
    finishedAt: Date.now(),
    toolCalls,
  };
  const toolResults: ToolCallResult[] = [
    { call: toolCalls[0], status: 'executed', output: 'conteúdo-x' },
  ];

  const final = await provider.continueConversation(
    {
      capability: 'chat',
      input: { messages: [{ role: 'user', content: 'leia /x.txt' }] },
    },
    priorResponse,
    toolResults,
    baseContext(),
  );

  assert.equal((final.output as { message: { content: string } }).message.content, 'O arquivo diz: conteúdo-x');

  // Só UMA chamada HTTP aconteceu aqui (continueConversation não repete execute()).
  assert.equal(requests.length, 1);
  const sentMessages = requests[0].messages;
  assert.deepEqual(
    sentMessages.map((m) => m.role),
    ['user', 'assistant', 'tool'],
  );
  assert.equal(sentMessages[0].content, 'leia /x.txt');
  assert.equal(sentMessages[1].content, 'Vou ler o arquivo.');
  assert.ok(Array.isArray(sentMessages[1].tool_calls), 'mensagem assistant carrega tool_calls');
});

test('continueConversation() — content da mensagem tool preserva callId/toolId/status/output/error', async () => {
  const { fetchImpl, requests } = chatFetchSequence([
    { message: { role: 'assistant', content: 'ok, entendido' } },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const toolCalls: ToolCall[] = [{ id: 'call-42', toolId: 'filesystem', input: { path: '/y.txt' } }];
  const priorResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: '' } },
    provider: 'ollama',
    finishedAt: Date.now(),
    toolCalls,
  };
  const toolResults: ToolCallResult[] = [
    { call: toolCalls[0], status: 'executed', output: { bytes: 128 } },
  ];

  await provider.continueConversation(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'leia /y.txt' }] } },
    priorResponse,
    toolResults,
    baseContext(),
  );

  const toolMessage = requests[0].messages.find((m) => m.role === 'tool');
  assert.ok(toolMessage, 'mensagem tool foi enviada');
  const parsed = JSON.parse(toolMessage!.content) as {
    callId: string;
    toolId: string;
    status: string;
    output: unknown;
    error?: string;
  };
  // `error: undefined` some no JSON (JSON.stringify descarta chaves undefined)
  // — comparar campo a campo em vez de deepEqual num objeto com a chave.
  assert.equal(parsed.callId, 'call-42');
  assert.equal(parsed.toolId, 'filesystem');
  assert.equal(parsed.status, 'executed');
  assert.deepEqual(parsed.output, { bytes: 128 });
  assert.equal('error' in parsed, false);
});

test('continueConversation() — múltiplas Tool Calls viram múltiplas mensagens tool, na mesma ordem', async () => {
  const { fetchImpl, requests } = chatFetchSequence([{ message: { role: 'assistant', content: 'ok' } }]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const toolCalls: ToolCall[] = [
    { id: 'call-1', toolId: 'tool-a', input: {} },
    { id: 'call-2', toolId: 'tool-b', input: {} },
    { id: 'call-3', toolId: 'tool-c', input: {} },
  ];
  const priorResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: '' } },
    provider: 'ollama',
    finishedAt: Date.now(),
    toolCalls,
  };
  const toolResults: ToolCallResult[] = [
    { call: toolCalls[0], status: 'executed', output: 'a' },
    { call: toolCalls[1], status: 'executed', output: 'b' },
    { call: toolCalls[2], status: 'executed', output: 'c' },
  ];

  await provider.continueConversation(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    priorResponse,
    toolResults,
    baseContext(),
  );

  const toolMessages = requests[0].messages.filter((m) => m.role === 'tool');
  assert.equal(toolMessages.length, 3);
  assert.deepEqual(
    toolMessages.map((m) => JSON.parse(m.content).toolId),
    ['tool-a', 'tool-b', 'tool-c'],
  );
});

test('continueConversation() — Tool Call com erro ainda vira mensagem tool (status "failed", error preenchido)', async () => {
  const { fetchImpl, requests } = chatFetchSequence([
    { message: { role: 'assistant', content: 'Vi que houve um erro, mas segui em frente.' } },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: { path: '/nao-existe' } }];
  const priorResponse: AIResponse = {
    capability: 'chat',
    output: { message: { role: 'assistant', content: '' } },
    provider: 'ollama',
    finishedAt: Date.now(),
    toolCalls,
  };
  const toolResults: ToolCallResult[] = [
    { call: toolCalls[0], status: 'failed', error: 'ENOENT: arquivo não encontrado' },
  ];

  const final = await provider.continueConversation(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'leia /nao-existe' }] } },
    priorResponse,
    toolResults,
    baseContext(),
  );

  // O loop NÃO interrompe — a IA respondeu normalmente mesmo com a falha.
  assert.equal(
    (final.output as { message: { content: string } }).message.content,
    'Vi que houve um erro, mas segui em frente.',
  );
  const toolMessage = requests[0].messages.find((m) => m.role === 'tool')!;
  const parsed = JSON.parse(toolMessage.content) as { status: string; error?: string };
  assert.equal(parsed.status, 'failed');
  assert.equal(parsed.error, 'ENOENT: arquivo não encontrado');
});

test('continueConversation() — capacidade diferente de "chat" lança erro claro', async () => {
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl: offlineFetch() });
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'x', input: {} }];

  await assert.rejects(
    () =>
      provider.continueConversation(
        { capability: 'embeddings', input: {} },
        { capability: 'embeddings', output: {}, provider: 'ollama', finishedAt: Date.now(), toolCalls },
        [{ call: toolCalls[0], status: 'executed', output: 'ok' }],
        baseContext(),
      ),
    /não suporta continueConversation/,
  );
});

test('continueConversation() — toolResults vazio lança erro claro (nada a enviar ao modelo)', async () => {
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl: offlineFetch() });

  await assert.rejects(
    () =>
      provider.continueConversation(
        { capability: 'chat', input: { messages: [] } },
        { capability: 'chat', output: {}, provider: 'ollama', finishedAt: Date.now() },
        [],
        baseContext(),
      ),
    /ao menos um ToolCallResult/,
  );
});

test('continueConversation() — Ollama offline na 2ª chamada propaga o mesmo erro amigável de chat()', async () => {
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl: offlineFetch() });
  const toolCalls: ToolCall[] = [{ id: 'call-1', toolId: 'filesystem', input: {} }];

  await assert.rejects(
    () =>
      provider.continueConversation(
        { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
        { capability: 'chat', output: {}, provider: 'ollama', finishedAt: Date.now(), toolCalls },
        [{ call: toolCalls[0], status: 'executed', output: 'ok' }],
        baseContext(),
      ),
    /Não foi possível conectar ao Ollama/,
  );
  assert.equal(provider.health().ok, false);
});

/**
 * Testes de Tool Calling (Sprint 21): `OllamaProvider.execute()` traduz
 * `request.tools` (`ToolDefinition[]`, Sprint 20) para o protocolo oficial de
 * "function calling" do Ollama, e converte `message.tool_calls` da resposta
 * de volta para `AIResponse.toolCalls` (`ToolCall[]`). Nenhum teste aqui usa
 * um `toolId`/nome de Tool "especial" (nada de `filesystem`) — a tradução é
 * genérica para qualquer `ToolDefinition`, como a Sprint exige.
 */

/** Uma `ToolDefinition` de exemplo GENÉRICA (não-Filesystem) para os testes desta seção. */
function weatherToolDefinition(): ToolDefinition {
  return {
    id: 'weather',
    name: 'Weather',
    description: 'Consulta a previsão do tempo de uma cidade.',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string', description: 'Nome da cidade.' } },
      required: ['city'],
    },
  };
}

test('request.tools vazio — corpo enviado a /api/chat NÃO inclui "tools"', async () => {
  let sentBody: Record<string, unknown> = {};
  const fetchImpl = fakeFetch({
    '/api/chat': (init) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ message: { role: 'assistant', content: 'oi' } });
    },
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  // Sem `tools` de todo (undefined).
  await provider.execute(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    baseContext(),
  );
  assert.equal('tools' in sentBody, false);

  // `tools: []` explícito também não deve virar um campo `tools` no corpo.
  await provider.execute(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] }, tools: [] },
    baseContext(),
  );
  assert.equal('tools' in sentBody, false);
});

test('request.tools preenchido — corpo enviado a /api/chat inclui "tools" no formato oficial do Ollama', async () => {
  let sentBody: { tools?: unknown } = {};
  const fetchImpl = fakeFetch({
    '/api/chat': (init) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ message: { role: 'assistant', content: 'ok' } });
    },
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });
  const definition = weatherToolDefinition();

  await provider.execute(
    {
      capability: 'chat',
      input: { messages: [{ role: 'user', content: 'qual o clima em SP?' }] },
      tools: [definition],
    },
    baseContext(),
  );

  assert.deepEqual(sentBody.tools, [
    {
      type: 'function',
      function: {
        name: 'weather',
        description: definition.description,
        parameters: definition.parameters,
      },
    },
  ]);
});

test('Tradução ToolDefinition → payload Ollama — múltiplas Tools viram múltiplas entradas "function", cada uma com seu próprio schema', async () => {
  let sentBody: { tools?: Array<{ type: string; function: { name: string } }> } = {};
  const fetchImpl = fakeFetch({
    '/api/chat': (init) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ message: { role: 'assistant', content: 'ok' } });
    },
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const definitions: ToolDefinition[] = [
    weatherToolDefinition(),
    {
      id: 'calculator',
      name: 'Calculator',
      description: 'Faz contas simples.',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string' } },
        required: ['expression'],
      },
    },
  ];

  await provider.execute(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] }, tools: definitions },
    baseContext(),
  );

  assert.equal(sentBody.tools?.length, 2);
  assert.deepEqual(
    sentBody.tools?.map((t) => t.function.name),
    ['weather', 'calculator'],
  );
  assert.ok(sentBody.tools?.every((t) => t.type === 'function'));
});

test('Parsing de tool_calls — resposta do Ollama vira AIResponse.toolCalls (id/toolId/input)', async () => {
  const fetchImpl = fakeFetch({
    '/api/chat': () =>
      jsonResponse({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'weather', arguments: { city: 'São Paulo' } } }],
        },
      }),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const response = await provider.execute(
    {
      capability: 'chat',
      input: { messages: [{ role: 'user', content: 'qual o clima em SP?' }] },
      tools: [weatherToolDefinition()],
    },
    baseContext(),
  );

  assert.equal(response.toolCalls?.length, 1);
  const call = response.toolCalls![0];
  assert.equal(typeof call.id, 'string');
  assert.ok(call.id.length > 0);
  assert.equal(call.toolId, 'weather');
  assert.deepEqual(call.input, { city: 'São Paulo' });
});

test('Múltiplos tool_calls — cada um vira um ToolCall próprio, na mesma ordem, com ids únicos', async () => {
  const fetchImpl = fakeFetch({
    '/api/chat': () =>
      jsonResponse({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [
            { function: { name: 'weather', arguments: { city: 'SP' } } },
            { function: { name: 'calculator', arguments: { expression: '2+2' } } },
          ],
        },
      }),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const response = await provider.execute(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    baseContext(),
  );

  assert.equal(response.toolCalls?.length, 2);
  assert.deepEqual(
    response.toolCalls?.map((c) => c.toolId),
    ['weather', 'calculator'],
  );
  assert.deepEqual(
    response.toolCalls?.map((c) => c.input),
    [{ city: 'SP' }, { expression: '2+2' }],
  );
  // Ids únicos entre as chamadas.
  const ids = response.toolCalls!.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('arguments como string JSON — é desserializado antes de virar ToolCall.input', async () => {
  const fetchImpl = fakeFetch({
    '/api/chat': () =>
      jsonResponse({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'weather', arguments: JSON.stringify({ city: 'Curitiba' }) } }],
        },
      }),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const response = await provider.execute(
    { capability: 'chat', input: { messages: [{ role: 'user', content: 'oi' }] } },
    baseContext(),
  );

  assert.deepEqual(response.toolCalls?.[0].input, { city: 'Curitiba' });
});

test('Sem tool_calls — AIResponse.toolCalls fica ausente (não [], não undefined explícito na chave)', async () => {
  const fetchImpl = fakeFetch({
    '/api/chat': () => jsonResponse({ message: { role: 'assistant', content: 'Oi! Como posso ajudar?' } }),
  });
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });

  const response = await provider.execute(
    {
      capability: 'chat',
      input: { messages: [{ role: 'user', content: 'oi' }] },
      tools: [weatherToolDefinition()],
    },
    baseContext(),
  );

  assert.equal(response.toolCalls, undefined);
  assert.equal('toolCalls' in response, false);
});

test('Integração completa — Provider.execute() → toolCalls → AIManager (Agent Loop) → ToolManager fake → continueConversation() → resposta final', async () => {
  // 1ª chamada a /api/chat (dentro de execute()): o Ollama decide chamar a
  // Tool. 2ª chamada (dentro de continueConversation(), disparada pelo
  // AIManager depois que o Tool System "fake" já executou): resposta final.
  const { fetchImpl, requests } = chatFetchSequence([
    {
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [{ function: { name: 'weather', arguments: { city: 'SP' } } }],
      },
    },
    { message: { role: 'assistant', content: 'O clima em SP está ensolarado.' } },
  ]);
  const provider = createOllamaProvider({ baseUrl: BASE_URL, fetchImpl });
  const registry = new AIProviderRegistry();
  registry.register(provider);

  // ToolManager "fake" — só o suficiente do contrato `ToolExecutor` (Sprint
  // 15.2/20); prova que o AIManager (Agent Loop, Sprint 19) e o OllamaProvider
  // (Sprint 21) não conhecem um `ToolManager` real, só o contrato.
  const toolExecutorCalls: unknown[] = [];
  const toolExecutor: ToolExecutor = {
    async execute<TInput = unknown, TOutput = unknown>(request: { toolId: string; input: TInput }) {
      toolExecutorCalls.push(request);
      assert.equal(request.toolId, 'weather');
      assert.deepEqual(request.input, { city: 'SP' });
      return {
        toolId: 'weather',
        success: true,
        output: { forecast: 'ensolarado' } as TOutput,
        startedAt: Date.now(),
        finishedAt: Date.now(),
      };
    },
    has: () => true,
    list: () => [],
  };
  const aiManager = new AIManager({ registry, toolExecutor });

  const response = await aiManager.execute<{ message: { content: string } }>({
    capability: 'chat',
    input: { messages: [{ role: 'user', content: 'qual o clima em SP?' }] },
    tools: [weatherToolDefinition()],
  });

  // Duas chamadas HTTP: execute() e continueConversation().
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].tools, [
    {
      type: 'function',
      function: {
        name: 'weather',
        description: weatherToolDefinition().description,
        parameters: weatherToolDefinition().parameters,
      },
    },
  ]);

  // O Tool System "fake" foi de fato acionado pelo Agent Loop, uma vez.
  assert.equal(toolExecutorCalls.length, 1);

  // A resposta final veio de continueConversation(), com os resultados da
  // 1ª rodada preservados — o fluxo completo pedido pela Sprint 21.
  assert.equal(response.provider, 'ollama');
  assert.equal(response.output.message.content, 'O clima em SP está ensolarado.');
  assert.equal(response.toolCallResults?.length, 1);
  assert.equal(response.toolCallResults?.[0].status, 'executed');
  assert.deepEqual(response.toolCallResults?.[0].output, { forecast: 'ensolarado' });
});
