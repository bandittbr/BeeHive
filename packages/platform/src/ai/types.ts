/**
 * Contratos da AI Layer do BeeHive.
 *
 * TODA inteligência artificial do sistema passa por esta camada. Nenhum módulo
 * ou Service conhece um modelo/provedor concreto — todos falam com o `AIManager`
 * por estes contratos, e o provedor é escolhido por abstração (por capacidade).
 *
 * Aqui há apenas abstrações. Nenhum provedor, nenhuma integração.
 */
import type { ToolDefinition } from '../tools/types';

/**
 * Capacidades de IA previstas. Apenas o CATÁLOGO — nenhuma é implementada.
 * Um provedor declara quais suporta; o AIManager roteia por capacidade.
 */
export type AICapability =
  | 'chat'
  | 'embeddings'
  | 'vision'
  | 'imageGeneration'
  | 'videoGeneration'
  | 'speech'
  | 'ocr'
  | 'reasoning'
  | 'tools'
  | 'streaming';

/** Parâmetros da solicitação (modelo, temperatura, preferência de provedor...). */
export interface AIRequestOptions {
  readonly model?: string;
  /** Preferência de provedor por id (a resolução por abstração ainda decide). */
  readonly provider?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stream?: boolean;
  /** Extensível sem quebrar o contrato. */
  readonly extra?: Record<string, unknown>;
}

/** Uma solicitação à AI Layer. O `input` é tipado por quem chama (por capacidade). */
export interface AIRequest<TInput = unknown> {
  readonly capability: AICapability;
  readonly input: TInput;
  readonly options?: AIRequestOptions;
  /**
   * Definições das Tools disponíveis (Sprint 20) — o `AIManager` popula
   * automaticamente antes de `provider.execute()`, usando
   * `toolExecutor.definitions()`. Provider-agnostic: cada Provider decide se
   * e como usa isto (function-calling da OpenAI/Claude/Gemini/etc.); um
   * Provider que ainda não suporta Tool Calls simplesmente ignora o campo.
   * Quem monta a `AIRequest` pode informar explicitamente para sobrepor a
   * lista automática (ex.: um subconjunto curado de Tools).
   */
  readonly tools?: readonly ToolDefinition[];
}

/** Contexto de execução de uma solicitação (criado pelo AIManager). */
export interface AIContext {
  readonly requestId: string;
  readonly capability: AICapability;
  /** Quem originou (ex.: 'conversation.service'). */
  readonly source?: string;
  /** Cancelamento. */
  readonly signal?: AbortSignal;
  readonly startedAt: number;
  readonly metadata?: Record<string, unknown>;
}

export interface AIUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

/**
 * Uma chamada de Tool que o modelo pediu, dentro de uma `AIResponse`. O
 * `AIManager` (Sprint 15.2) executa cada uma sequencialmente via `runTool()`
 * e converte o resultado em `ToolCallResult`.
 */
export interface ToolCall {
  readonly id: string;
  readonly toolId: string;
  readonly input: unknown;
}

/**
 * Estados do ciclo de vida de uma Tool Call. Nesta Sprint o `AIManager` só
 * produz `'executed'` (a Tool rodou e teve sucesso) e `'failed'` (a Tool
 * rodou e falhou, ou não pôde ser executada) — `'pending'`/`'skipped'` ficam
 * reservados para quando houver reenvio ao modelo e planejamento (sprints
 * futuras).
 */
export type ToolCallStatus = 'pending' | 'executed' | 'failed' | 'skipped';

/**
 * O resultado de uma Tool Call já executada pelo `AIManager` — uma por
 * `ToolCall`, na mesma ordem, dentro de `AIResponse.toolCallResults`.
 */
export interface ToolCallResult {
  readonly call: ToolCall;
  readonly status: ToolCallStatus;
  readonly output?: unknown;
  readonly error?: string;
}

/** A resposta da AI Layer. `output` é tipado por capacidade em quem chama. */
export interface AIResponse<TOutput = unknown> {
  readonly capability: AICapability;
  readonly output: TOutput;
  /** Id do provedor que respondeu. */
  readonly provider: string;
  readonly model?: string;
  readonly usage?: AIUsage;
  readonly finishedAt: number;
  /**
   * Tool Calls que o modelo pediu nesta resposta (opcional — a maioria dos
   * provedores/capacidades não usa). Preenchido pelo Provider concreto.
   */
  readonly toolCalls?: readonly ToolCall[];
  /**
   * Resultados de cada `ToolCall` acima, na mesma ordem — preenchido pelo
   * `AIManager` (Sprint 15.2) depois de executar cada uma sequencialmente
   * via `runTool()`. Ausente se `toolCalls` não veio ou estava vazio. Ainda
   * NÃO é reenviado ao modelo (isso é uma sprint futura) — só devolvido a
   * quem chamou `AIManager.execute()`.
   */
  readonly toolCallResults?: readonly ToolCallResult[];
}

/** Callbacks para respostas em streaming (capacidade `streaming`). */
export interface AIStreamHandlers {
  onDelta: (text: string) => void;
  onDone?: (response: AIResponse) => void;
  onError?: (message: string) => void;
}

export interface AIProviderHealth {
  readonly ok: boolean;
  readonly detail?: string;
}

/**
 * Um modelo disponível num provedor — o mínimo comum entre provedores muito
 * diferentes (Ollama, OpenAI, Claude, Gemini...). Cada provedor pode saber
 * mais sobre seus próprios modelos; isto é só o que o resto do sistema pode
 * assumir sem conhecer o provedor concreto (P7).
 */
export interface AIProviderModelSummary {
  readonly name: string;
}

/**
 * Formato genérico da capacidade `chat` — o mínimo comum entre provedores
 * (Ollama, OpenAI, Claude...). Quem chama o AIManager para `capability: 'chat'`
 * usa `AIRequest<ChatInput>`/`AIResponse<ChatOutput>`; cada Provider traduz
 * para seu próprio formato internamente (ver `OllamaProvider.execute()`).
 */
export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface ChatInput {
  readonly messages: readonly ChatMessage[];
}

export interface ChatOutput {
  readonly message: ChatMessage;
}

/**
 * `AIProviderInterface` — o contrato de um provedor de IA.
 *
 * Uma implementação concreta (ex.: um adaptador para o backend/Ollama) será
 * criada em sprint futura. O AIManager depende SÓ deste contrato.
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly AICapability[];

  supports(capability: AICapability): boolean;

  execute(request: AIRequest, context: AIContext): Promise<AIResponse>;

  /** Opcional: apenas provedores que suportam `streaming` implementam. */
  stream?(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void>;

  /**
   * Continua uma conversa depois que o `AIManager` executou as Tool Calls
   * pedidas por `execute()` — a "segunda rodada" do Agent Loop (Sprint 19).
   *
   * Recebe a MESMA solicitação original (`request` — o Provider extrai dali
   * o histórico/entrada, exatamente como já faz em `execute()`), a resposta
   * que pediu as Tools (`response`, com `toolCalls` preenchido) e os
   * resultados já executados pelo Tool System (`toolResults`, na mesma
   * ordem das `toolCalls`, com `callId`/`toolId`/`status`/`output`/`error`
   * preservados via `ToolCallResult.call`). Devolve a resposta FINAL, pronta
   * para quem chamou `AIManager.execute()`.
   *
   * Provider-agnostic por design: esta assinatura não menciona `ChatMessage`
   * nem nenhum formato específico de um provedor — cada Provider traduz
   * `request` + `response` + `toolResults` para seu próprio protocolo de
   * "mensagens" internamente (ver `OllamaProvider.continueConversation()`).
   * Nenhuma camada acima do Provider monta esse formato.
   *
   * Opcional, no mesmo padrão de `stream`: só Providers que também podem
   * produzir `toolCalls` precisam implementar. Se `execute()` de um Provider
   * devolve `toolCalls` mas o Provider não implementa `continueConversation`,
   * o `AIManager` lança um erro claro em vez de silenciosamente devolver uma
   * resposta incompleta.
   *
   * Só UMA rodada por chamada a `AIManager.execute()`: mesmo que a resposta
   * final também traga `toolCalls`, o `AIManager` não os executa de novo
   * nesta Sprint (sem recursão, sem múltiplas rodadas — ver `AIManager`).
   */
  continueConversation?(
    request: AIRequest,
    response: AIResponse,
    toolResults: readonly ToolCallResult[],
    context: AIContext,
  ): Promise<AIResponse>;

  health(): AIProviderHealth;

  /** Opcional: provedores com múltiplos modelos instaláveis/selecionáveis. */
  listModels?(): Promise<readonly AIProviderModelSummary[]>;
}
