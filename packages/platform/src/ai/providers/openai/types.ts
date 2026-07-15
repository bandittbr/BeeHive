/**
 * Tipos do protocolo HTTP da API de Chat Completions da OpenAI
 * (formato "de arame"), também compatível com OpenRouter, Groq, Together, etc.
 *
 * Nada aqui é o contrato da AI Layer (esse vive em `ai/types.ts`). Este
 * arquivo é conhecimento PRIVADO do provedor OpenAI — nenhum outro componente
 * do sistema deve importar daqui além do próprio provedor.
 */

/** Conteúdo multimodal (texto + imagem) no formato da API da OpenAI. */
export type OpenAIContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/** Mensagem no formato da API de Chat Completions (suporta multimodal). */
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[];
  /** Tool Calls em mensagens de assistant (Sprint 19+). */
  tool_calls?: OpenAIToolCall[];
  /** Nome da Tool que respondeu (mensagens role: 'tool'). */
  tool_call_id?: string;
}

/** Tool Call no formato OpenAI. */
export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Tool definition no formato OpenAI (function calling). */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: unknown;
  };
}

/** Corpo da requisição POST /chat/completions (stream: false). */
export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream: false;
  temperature?: number;
  max_tokens?: number;
  tools?: OpenAITool[];
}

/** Corpo da requisição POST /chat/completions (stream: true). */
export interface OpenAIChatStreamRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream: true;
  temperature?: number;
  max_tokens?: number;
  tools?: OpenAITool[];
}

/** Resposta de POST /chat/completions (stream: false). */
export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIChatMessage;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: { message: string; type?: string; code?: string };
}

/** Um chunk do streaming SSE de POST /chat/completions. */
export interface OpenAIChatStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string | OpenAIContentPart[]; tool_calls?: OpenAIToolCall[] };
    finish_reason: string | null;
  }>;
}

/** Erro retornado pela API. */
export interface OpenAIErrorResponse {
  error: {
    message: string;
    type?: string;
    code?: string;
    param?: unknown;
  };
}
