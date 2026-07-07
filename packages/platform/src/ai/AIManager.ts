import type { ILogger } from '../kernel';
import type { ToolExecutor, ToolRequest, ToolResponse, ToolSnapshot } from '../tools';
import type { AIProviderRegistry } from './AIProviderRegistry';
import type {
  AICapability,
  AIContext,
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamHandlers,
  ToolCall,
  ToolCallResult,
} from './types';

/** Dados opcionais para compor o contexto de uma solicitação. */
export interface AIExecuteInit {
  source?: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface AIManagerDeps {
  registry: AIProviderRegistry;
  logger?: ILogger;
  /** Execução de Tools — a IA age no mundo externo SÓ por aqui (nunca os providers). */
  toolExecutor?: ToolExecutor;
}

/**
 * Id canônico do AIManager como Service (`ServiceContext.getService(AI_MANAGER_ID)`).
 * Duplica, de propósito, a string já usada em `runtime/RuntimeManager.ts` — o
 * Runtime está fora do escopo desta task e não pode ser alterado para importar
 * daqui.
 */
export const AI_MANAGER_ID = 'ai.manager';

let seq = 0;
const nextRequestId = () => `ai-${Date.now()}-${seq++}`;

/** Duck-type: um registry que também sabe o modelo padrão ativo (ex.: `ProviderManager`). */
interface DefaultModelSource {
  getDefaultModel(): string | null;
}

function hasDefaultModel(registry: unknown): registry is DefaultModelSource {
  return typeof (registry as Partial<DefaultModelSource>).getDefaultModel === 'function';
}

/**
 * AIManager — a porta única para IA no BeeHive.
 *
 * Recebe uma solicitação por capacidade, RESOLVE um provedor via registro (por
 * abstração) e delega. NUNCA conhece um provedor concreto — depende apenas do
 * `AIProviderRegistry` e do contrato `AIProvider`. Dependências injetadas (DI).
 */
export class AIManager {
  private readonly registry: AIProviderRegistry;
  private readonly logger?: ILogger;
  private readonly toolExecutor?: ToolExecutor;

  constructor(deps: AIManagerDeps) {
    this.registry = deps.registry;
    this.logger = deps.logger;
    this.toolExecutor = deps.toolExecutor;
  }

  /** Executa uma solicitação e devolve a resposta. `TOutput` tipa a saída. */
  async execute<TOutput = unknown>(
    request: AIRequest,
    init?: AIExecuteInit,
  ): Promise<AIResponse<TOutput>> {
    const context = this.makeContext(request.capability, init);
    const provider = this.resolve(request.capability, request.options?.provider);
    const requestWithTools = this.withTools(request);
    this.logger?.info(`IA: ${request.capability} via ${provider.name}`, {
      requestId: context.requestId,
    });
    try {
      const response = await provider.execute(requestWithTools, context);
      const withToolCalls = await this.runToolCalls(response, context);
      const final = await this.continueIfNeeded(requestWithTools, withToolCalls, provider, context);
      return final as AIResponse<TOutput>;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger?.error(`IA falhou: ${request.capability}`, {
        requestId: context.requestId,
        reason,
      });
      throw error;
    }
  }

  /**
   * Executa em streaming, delegando ao Provider resolvido pela MESMA capacidade
   * da solicitação (ex.: `'chat'` — não existe uma capacidade "streaming"
   * separada; é um MODO de resposta de uma capacidade já suportada). O
   * `AIManager` só sabe que o Provider declarou suporte via `provider.stream`
   * (opcional no contrato) — nunca conhece Ollama/OpenAI/etc.
   *
   * `handlers` é repassado tal como recebido: cada pedaço (`onDelta`) e a
   * resposta final (`onDone`) vêm do Provider, sem transformação aqui — é
   * exatamente "propagar os chunks". `context.signal` (cancelamento/timeout,
   * já compostos por quem chamou — ver `ConversationService`) é passado ao
   * Provider do mesmo jeito que em `execute()`.
   *
   * Nesta Sprint (17), Tool Calls NÃO são tratadas durante streaming — mesmo
   * que a resposta final traga `toolCalls`, `runToolCalls()` não é chamado
   * aqui (isso é uma extensão de sprint futura, independente do streaming).
   */
  async stream(request: AIRequest, handlers: AIStreamHandlers, init?: AIExecuteInit): Promise<void> {
    const context = this.makeContext(request.capability, init);
    const provider = this.resolve(request.capability, request.options?.provider);
    if (!provider.stream) {
      throw new Error(`Provider ${provider.id} não suporta streaming`);
    }
    this.logger?.info(`IA (streaming): ${request.capability} via ${provider.name}`, {
      requestId: context.requestId,
    });
    try {
      await provider.stream(request, handlers, context);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger?.error(`IA (streaming) falhou: ${request.capability}`, {
        requestId: context.requestId,
        reason,
      });
      // Convite opcional (contrato `AIStreamHandlers`): quem chamou pode não
      // ter passado `onError` e tratar só via rejeição da Promise — ambos
      // funcionam, o AIManager garante os dois.
      handlers.onError?.(reason);
      throw error;
    }
  }

  /**
   * Executa uma Tool pelo Tool System. É a ÚNICA forma de a IA agir no mundo
   * externo — os providers nunca conhecem Tools. É também o que `runToolCalls()`
   * usa internamente para cada `ToolCall` detectada numa resposta.
   */
  runTool<TInput = unknown, TOutput = unknown>(
    request: ToolRequest<TInput>,
  ): Promise<ToolResponse<TOutput>> {
    if (!this.toolExecutor) {
      throw new Error('Tool System indisponível no AIManager');
    }
    return this.toolExecutor.execute<TInput, TOutput>(request);
  }

  /** Tools disponíveis para a IA (base para expor ferramentas ao modelo). */
  tools(): readonly ToolSnapshot[] {
    return this.toolExecutor?.list() ?? [];
  }

  /** Capacidades atualmente disponíveis (união das dos provedores registrados). */
  capabilities(): AICapability[] {
    const set = new Set<AICapability>();
    for (const provider of this.registry.list()) {
      for (const capability of provider.capabilities) set.add(capability);
    }
    return [...set];
  }

  /**
   * O modelo ativo, segundo o registry — só disponível quando o registry
   * injetado sabe responder isso (ex.: `ProviderManager`, via `getDefaultModel()`).
   * Um `AIProviderRegistry` puro não sabe, e devolve `undefined` (sem erro):
   * quem chamar decide o que fazer na ausência de um modelo padrão.
   */
  activeModel(): string | undefined {
    if (!hasDefaultModel(this.registry)) return undefined;
    return this.registry.getDefaultModel() ?? undefined;
  }

  /**
   * Popula `request.tools` automaticamente a partir do Tool System (Sprint
   * 20) — `ToolRegistry.definitions()` → `ToolManager.definitions()` →
   * aqui → `Provider.execute({ ..., tools })`. Só isso: nenhuma Tool Call é
   * detectada/executada por causa disto (esse mecanismo é o Agent Loop,
   * inalterado — Sprint 19).
   *
   * Se quem chamou já informou `request.tools` explicitamente, essa lista é
   * respeitada (não sobrescrita). Sem `toolExecutor` injetado, ou se ele não
   * implementa `definitions()` (contrato opcional, como `stream`), o
   * resultado é `[]` — nenhum Provider quebra por causa disso.
   */
  private withTools(request: AIRequest): AIRequest {
    if (request.tools) return request;
    const tools = this.toolExecutor?.definitions?.() ?? [];
    return { ...request, tools };
  }

  /**
   * Se a resposta trouxe Tool Calls, executa cada uma SEQUENCIALMENTE (uma
   * de cada vez, na ordem pedida — sem paralelismo, sem retry, sem
   * planejamento: Sprint 15.2) via `runTool()` (já existente), e devolve a
   * mesma resposta com `toolCallResults` preenchido. Se uma Tool falhar, o
   * erro vira um `ToolCallResult{status:'failed'}` e o loop CONTINUA para a
   * próxima — uma falha não interrompe as demais. Os resultados NÃO são
   * reenviados ao modelo aqui; só devolvidos a quem chamou `execute()`.
   */
  private async runToolCalls(response: AIResponse, context: AIContext): Promise<AIResponse> {
    const toolCalls = response.toolCalls;
    if (!toolCalls || toolCalls.length === 0) return response;

    this.logger?.info(`IA solicitou ${toolCalls.length} Tool Call(s)`, {
      requestId: context.requestId,
      capability: context.capability,
      provider: response.provider,
      tools: toolCalls.map((call) => call.toolId),
    });

    const toolCallResults: ToolCallResult[] = [];
    for (const call of toolCalls) {
      toolCallResults.push(await this.runOneToolCall(call, context));
    }

    return { ...response, toolCallResults };
  }

  /**
   * Agent Loop (Sprint 19): se a resposta trouxe `toolCallResults` (ou seja,
   * `runToolCalls()` de fato executou alguma Tool Call), chama
   * `provider.continueConversation()` no MESMO Provider que iniciou a
   * conversa (nunca resolve de novo, nunca troca de Provider) e devolve a
   * resposta final — a que `execute()` entrega a quem chamou.
   *
   * Sem `toolCallResults` (resposta comum, sem Tool Calls, ou `toolCalls`
   * veio vazio), devolve a resposta tal como veio — nenhuma segunda chamada
   * ao Provider acontece.
   *
   * Só uma rodada: o que `continueConversation()` devolve é FINAL, mesmo que
   * traga `toolCalls` de novo — esta Sprint não os executa (sem recursão,
   * sem múltiplas rodadas, sem agente autônomo; ver restrições da Sprint 19).
   */
  private async continueIfNeeded(
    request: AIRequest,
    response: AIResponse,
    provider: AIProvider,
    context: AIContext,
  ): Promise<AIResponse> {
    const toolCallResults = response.toolCallResults;
    if (!toolCallResults || toolCallResults.length === 0) return response;

    if (!provider.continueConversation) {
      throw new Error(
        `Provider ${provider.id} executou Tool Calls mas não implementa continueConversation() — não é possível completar o Agent Loop.`,
      );
    }

    this.logger?.info(
      `IA: segunda rodada (Agent Loop) após ${toolCallResults.length} Tool Call(s)`,
      { requestId: context.requestId, capability: context.capability, provider: provider.id },
    );

    const finalResponse = await provider.continueConversation(request, response, toolCallResults, context);

    // Garante que os resultados da 1ª rodada não se percam mesmo que a
    // resposta final não os ecoe de volta (nada pode ser perdido entre as
    // chamadas — requisito explícito da Sprint 19). `toolCalls`/`output`/
    // `model`/`usage` da resposta final permanecem os que o Provider devolveu.
    return { ...finalResponse, toolCallResults };
  }

  /** Executa uma única Tool Call e converte o `ToolResponse` em `ToolCallResult`, logando cada etapa. */
  private async runOneToolCall(call: ToolCall, context: AIContext): Promise<ToolCallResult> {
    const meta = { requestId: context.requestId, callId: call.id, toolId: call.toolId };
    this.logger?.info(`Tool Call solicitada: ${call.toolId}`, meta);
    this.logger?.debug('Tool Call: início da execução', meta);

    try {
      const toolResponse = await this.runTool({
        toolId: call.toolId,
        input: call.input,
        options: context.signal ? { signal: context.signal } : undefined,
      });

      if (toolResponse.success) {
        this.logger?.info(`Tool Call: sucesso (${call.toolId})`, meta);
        this.logger?.debug('Tool Call: fim da execução', meta);
        return { call, status: 'executed', output: toolResponse.output };
      }

      const error = toolResponse.error ?? 'erro desconhecido';
      this.logger?.error(`Tool Call: erro (${call.toolId})`, { ...meta, error });
      this.logger?.debug('Tool Call: fim da execução', meta);
      return { call, status: 'failed', error };
    } catch (error) {
      // runTool() lança se o Tool System não estiver disponível (sem
      // toolExecutor injetado) — vira uma falha desta Tool Call, sem
      // interromper as próximas (requisito 4 da Task 15.2).
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger?.error(`Tool Call: erro (${call.toolId})`, { ...meta, error: message });
      this.logger?.debug('Tool Call: fim da execução', meta);
      return { call, status: 'failed', error: message };
    }
  }

  private resolve(capability: AICapability, preferredId?: string): AIProvider {
    const provider = this.registry.findByCapability(capability, preferredId);
    if (!provider) {
      throw new Error(`Nenhum provedor de IA disponível para a capacidade: ${capability}`);
    }
    return provider;
  }

  private makeContext(capability: AICapability, init?: AIExecuteInit): AIContext {
    return {
      requestId: nextRequestId(),
      capability,
      source: init?.source,
      signal: init?.signal,
      startedAt: Date.now(),
      metadata: init?.metadata,
    };
  }
}
