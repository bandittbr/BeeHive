export interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;

  execute(input: string, context: AgentContext): AsyncIterable<AgentChunk>;
  interrupt(): void;
  getState(): AgentState;
}

export interface AgentContext {
  sessionId: string;
  userId?: string;
  tools?: string[];
  memory?: boolean;
}

export type AgentChunk =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | { type: 'error'; message: string }
  | { type: 'done'; usage: TokenUsage };

export interface AgentState {
  status: 'idle' | 'running' | 'waiting' | 'error' | 'done';
  iteration: number;
  tokensUsed: number;
  lastActivity: number;
}
