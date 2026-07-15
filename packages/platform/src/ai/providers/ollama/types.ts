/**
 * Tipos do protocolo HTTP do Ollama (formato "de arame") e das saídas do
 * `OllamaProvider`.
 *
 * Nada aqui é o contrato da AI Layer (esse vive em `ai/types.ts`). Este
 * arquivo é conhecimento PRIVADO do provedor Ollama — nenhum outro
 * componente do sistema deve importar daqui além do próprio provedor.
 */

/**
 * `'tool'` foi adicionado na Sprint 19 (Agent Loop) — a mensagem que carrega
 * o resultado de uma Tool Call de volta ao modelo, no formato que o próprio
 * `OllamaProvider.continueConversation()` monta. Nenhuma camada fora deste
 * provedor precisa conhecer esse role.
 */
export type OllamaChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Uma chamada de Tool dentro de uma mensagem `assistant`, no formato que o
 * Ollama espera/devolve (Sprint 19). Sem `id` — diferente do formato da
 * OpenAI, o Ollama correlaciona por ordem/nome, não por identificador.
 */
export interface OllamaToolCall {
  function: {
    name: string;
    arguments: unknown;
  };
}

export interface OllamaChatMessage {
  role: OllamaChatRole;
  content: string;
  /** Presente só em mensagens `assistant` que pediram Tool Calls (Sprint 19). */
  tool_calls?: OllamaToolCall[];
  /** Imagens em base64 para suporte multimodal (visão). */
  images?: string[];
}

/**
 * Uma Tool no formato oficial de "function calling" do Ollama (Sprint 21) —
 * o que vai em `OllamaChatRequestBody.tools`. Traduzido a partir de
 * `ToolDefinition` (Tool System, Sprint 20) por `toOllamaTools()`, genérico
 * para qualquer Tool — nada específico de Filesystem aqui.
 */
export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    /** JSON Schema (o mesmo `ToolDefinition.parameters`) — repassado como está. */
    parameters: unknown;
  };
}

/** Corpo enviado a POST /api/chat (sempre `stream: false` — só "chat" por ora). */
export interface OllamaChatRequestBody {
  model: string;
  messages: OllamaChatMessage[];
  stream: false;
  /** Presente só quando a solicitação trouxe Tools (Sprint 21). Omitido, não `[]`, quando vazio. */
  tools?: OllamaTool[];
}

/** Resposta de POST /api/chat sem streaming. */
export interface OllamaChatResponseBody {
  message?: OllamaChatMessage;
  error?: string;
}

/** Corpo enviado a POST /api/chat em streaming (Sprint 17). */
export interface OllamaChatStreamRequestBody {
  model: string;
  messages: OllamaChatMessage[];
  stream: true;
}

/**
 * Uma linha do corpo NDJSON de POST /api/chat em streaming. Cada linha traz um
 * pedaço (`message.content`) até `done: true` na última.
 */
export interface OllamaChatStreamChunk {
  message?: { role?: OllamaChatRole; content?: string };
  done?: boolean;
  error?: string;
}

/** Resposta de GET /api/tags. */
export interface OllamaTagsResponse {
  models?: Array<{
    name: string;
    size?: number;
    modified_at?: string;
    digest?: string;
  }>;
}

/** Resposta de POST /api/show. */
export interface OllamaShowResponse {
  modelfile?: string;
  parameters?: string;
  template?: string;
  details?: Record<string, unknown>;
  error?: string;
}

/** Entrada esperada em `AIRequest.input` quando `capability === 'chat'`. */
export interface OllamaChatInput {
  messages: OllamaChatMessage[];
}

/** Saída de `AIResponse.output` para a capacidade `chat`. */
export interface OllamaChatOutput {
  message: OllamaChatMessage;
}

/** Um modelo instalado, como devolvido por `listModels()`. */
export interface OllamaModelSummary {
  name: string;
  size?: number;
  modifiedAt?: string;
}

/** Detalhes de um modelo específico, como devolvido por `modelInfo()`. */
export interface OllamaModelInfo {
  model: string;
  modelfile?: string;
  parameters?: string;
  details?: Record<string, unknown>;
}
