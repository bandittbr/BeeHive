export interface IAIService {
  execute(req: AIRequest): Promise<AIResponse>;
  executeStream(req: AIRequest): AsyncIterable<AIStreamChunk>;
  executeWithTools(req: AIRequest, tools: unknown[]): Promise<AIResponse>;
}

export interface AIRequest {
  model?: string;
  provider?: string;
  messages: { role: string; content: string | unknown[] }[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
  stream?: boolean;
}

export interface AIResponse {
  id: string;
  content: string;
  toolCalls?: { id: string; name: string; args: unknown }[];
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latency: number;
}

export type AIStreamChunk =
  | { type: 'text'; content: string }
  | { type: 'tool-call'; id: string; name: string; args: unknown }
  | { type: 'error'; message: string }
  | { type: 'done' };
