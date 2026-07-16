export type AICapability =
  | 'chat'
  | 'streaming'
  | 'tool-calling'
  | 'function-calling'
  | 'structured-output'
  | 'vision'
  | 'image-generation'
  | 'embedding'
  | 'audio-transcription'
  | 'audio-generation'
  | 'code-execution';

export interface AIRequest {
  model?: string;
  provider?: string;
  messages: AIMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolCallDefinition[];
  stream?: boolean;
  responseFormat?: ResponseFormat;
  capabilities?: AICapability[];
  maxToolCalls?: number;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  finishReason: FinishReason;
  latency: number;
}

export interface AIStreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'done' | 'usage';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  toolCallId?: string;
  name?: string;
  toolCalls?: ToolCall[];
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mimeType?: string }
  | { type: 'file'; file: string; mimeType?: string };

export interface ToolCallDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool-calls'
  | 'error'
  | 'content-filter'
  | 'aborted';

export interface ResponseFormat {
  type: 'text' | 'json_object' | 'json_schema';
  jsonSchema?: Record<string, unknown>;
}

export interface AIManagerConfig {
  defaultProvider?: string;
  defaultModel?: string;
  maxToolCallsPerTurn?: number;
  maxTokensPerResponse?: number;
  enableStreaming?: boolean;
  costTracking?: boolean;
}

export interface AIProviderInfo {
  id: string;
  name: string;
  capabilities: AICapability[];
  models: string[];
  priority: number;
  isFree?: boolean;
  isConnected?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: AICapability[];
  contextLength?: number;
  isFree?: boolean;
}

export interface ModelFilter {
  provider?: string;
  capability?: AICapability;
  free?: boolean;
}

export interface IAIService {
  chat(messages: AIMessage[], options?: AIRequest): Promise<AIResponse>;
  chatStream(messages: AIMessage[], options?: AIRequest): AsyncIterable<AIStreamChunk>;
}
