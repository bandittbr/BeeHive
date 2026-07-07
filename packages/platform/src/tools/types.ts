import type { ILogger } from '../kernel';

/**
 * Contratos do Tool System do BeeHive.
 *
 * TODA interação da IA com o mundo externo passa por Tools, executadas pelo
 * ToolManager. Nenhum Service ou Provider executa ações diretamente. Aqui há
 * apenas abstrações — nenhuma Tool implementada.
 */

/** Categorias de Tools previstas (catálogo — nenhuma implementada). */
export type ToolCategory =
  | 'filesystem'
  | 'browser'
  | 'terminal'
  | 'git'
  | 'python'
  | 'ocr'
  | 'speech'
  | 'imageGeneration'
  | 'videoGeneration'
  | 'ffmpeg'
  | 'editor'
  | 'search'
  | 'network'
  | 'system';

/** Estados de uma Tool no seu ciclo de vida. */
export type ToolState =
  | 'Registered'
  | 'Initializing'
  | 'Available'
  | 'Busy'
  | 'Failed'
  | 'Disposed';

export interface ToolHealth {
  readonly ok: boolean;
  readonly detail?: string;
}

/** Contexto mínimo entregue à Tool na inicialização. */
export interface ToolInitContext {
  readonly logger: ILogger;
}

/** Contexto de execução de uma Tool (criado pelo ToolManager). */
export interface ToolContext {
  readonly requestId: string;
  readonly toolId: string;
  readonly logger: ILogger;
  readonly signal?: AbortSignal;
  readonly metadata?: Record<string, unknown>;
}

export interface ToolRequestOptions {
  readonly signal?: AbortSignal;
  readonly metadata?: Record<string, unknown>;
}

/** Uma solicitação de execução de Tool (endereçada por id). */
export interface ToolRequest<TInput = unknown> {
  readonly toolId: string;
  readonly input: TInput;
  readonly options?: ToolRequestOptions;
}

/** Resultado de uma execução (sucesso/erro explícitos). */
export interface ToolResponse<TOutput = unknown> {
  readonly toolId: string;
  readonly success: boolean;
  readonly output?: TOutput;
  readonly error?: string;
  readonly startedAt: number;
  readonly finishedAt: number;
}

/**
 * Tipos de valor aceitos num parâmetro (subconjunto de JSON Schema — o
 * suficiente para descrever Tools a um Provider de IA; não é um validador).
 */
export type ToolParameterType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/**
 * Schema (formato JSON Schema) de um parâmetro ou do corpo de entrada de uma
 * Tool. Recursivo (via `properties`/`items`/`oneOf`) para descrever objetos
 * aninhados e — como a `FilesystemTool`, que tem uma `operation` por chamada
 * — várias formas alternativas de entrada (`oneOf`, uma por operação).
 *
 * Sprint 20: existe só para DESCREVER a Tool a um Provider (OpenAI/Claude/
 * Gemini function-calling); ninguém aqui valida entrada contra o schema.
 */
export interface ToolParameterSchema {
  readonly type?: ToolParameterType | readonly ToolParameterType[];
  readonly description?: string;
  readonly enum?: readonly (string | number | boolean)[];
  readonly properties?: Readonly<Record<string, ToolParameterSchema>>;
  readonly required?: readonly string[];
  readonly items?: ToolParameterSchema;
  /** Formas alternativas de entrada — ex.: uma por `operation` da FilesystemTool. */
  readonly oneOf?: readonly ToolParameterSchema[];
  readonly additionalProperties?: boolean;
}

/**
 * A definição de uma Tool para consumo por um Provider de IA (Sprint 20) —
 * o que `AIManager` envia em `AIRequest.tools` antes de `provider.execute()`.
 * Provider-agnostic: nenhum campo aqui é específico de OpenAI/Claude/Gemini;
 * cada Provider futuro traduz `parameters` (JSON Schema) para o formato que
 * seu function-calling exige.
 */
export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameterSchema;
  readonly capabilities?: readonly string[];
}

/** `ToolInterface` — o contrato obrigatório de toda Tool. */
export interface Tool {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly capabilities: readonly string[];
  /** Descrição da Tool para a IA (Sprint 20) — toda Tool expõe a sua. */
  readonly definition: ToolDefinition;

  initialize(context: ToolInitContext): void | Promise<void>;
  execute(input: unknown, context: ToolContext): Promise<unknown>;
  health(): ToolHealth;
  status(): ToolState;
  dispose(): void | Promise<void>;
}

/** Retrato de uma Tool para observabilidade (Dashboard/Central futuros). */
export interface ToolSnapshot {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: ToolCategory;
  readonly capabilities: readonly string[];
  readonly state: ToolState;
  readonly lastError: string | null;
  readonly registeredAt: number;
  readonly updatedAt: number;
}

/**
 * Contrato que o AIManager usa para executar Tools — sem conhecer o ToolManager
 * concreto nem nenhuma Tool. É por aqui que as Tool Calls futuras acontecerão.
 */
export interface ToolExecutor {
  execute<TInput = unknown, TOutput = unknown>(
    request: ToolRequest<TInput>,
  ): Promise<ToolResponse<TOutput>>;
  has(toolId: string): boolean;
  list(): readonly ToolSnapshot[];
  /**
   * As `ToolDefinition` das Tools registradas (Sprint 20) — o `AIManager` usa
   * isto para popular `AIRequest.tools` automaticamente antes de
   * `provider.execute()`. Opcional (como `stream`/`continueConversation` em
   * `AIProvider`): um `ToolExecutor` mínimo (ex.: em testes) pode não
   * implementar; o `AIManager` trata a ausência como `[]`.
   */
  definitions?(): readonly ToolDefinition[];
}
