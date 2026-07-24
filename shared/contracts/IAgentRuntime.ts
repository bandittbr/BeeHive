export interface IAgentRuntime {
  register(definition: AgentDefinition): void;
  spawn(agentId: string, goal: string): Promise<AgentSession>;
  sendMessage(sessionId: string, message: string): AsyncIterable<AgentChunk>;
  stop(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<AgentSession | null>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  capabilities: string[];
  maxIterations?: number;
  model?: string;
}

export interface AgentSession {
  id: string;
  agentId: string;
  goal: string;
  status: 'thinking' | 'planning' | 'executing' | 'waiting' | 'completed' | 'failed';
  plan: AgentPlan[];
  context: Record<string, unknown>;
  startedAt: number;
}

export interface AgentPlan {
  step: number;
  action: string;
  capability?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
}

export type AgentChunk =
  | { type: 'thought'; content: string }
  | { type: 'plan'; steps: AgentPlan[] }
  | { type: 'execution'; step: number; capability: string; status: string }
  | { type: 'message'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
