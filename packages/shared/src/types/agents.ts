import type { AIMessage, TokenUsage } from './ai';
import type { MemoryType } from './memory';

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  model?: string;
  provider?: string;
  systemPrompt: string;
  tools: string[];
  skills: string[];
  memory?: {
    enabled: boolean;
    type: MemoryType[];
    ttl?: number;
  };
  maxIterations?: number;
  temperature?: number;
  triggers: AgentTrigger[];
  metadata?: Record<string, unknown>;
}

export type AgentTrigger =
  | { type: 'event'; eventType: string; filter?: string }
  | { type: 'schedule'; cron: string }
  | { type: 'conversation' }
  | { type: 'manual' };

export interface AgentInstance {
  id: string;
  definitionId: string;
  name: string;
  status: AgentStatus;
  session: AgentSession;
  startedAt: number;
  error?: string;
}

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'error'
  | 'completed'
  | 'stopped';

export interface AgentSession {
  id: string;
  messages: AIMessage[];
  context: Record<string, unknown>;
  iterationCount: number;
  tokenUsage: TokenUsage;
  startedAt: number;
  lastActivityAt: number;
}

export interface IAgentFramework {
  registerAgent(def: AgentDefinition): Promise<AgentInstance>;
  unregisterAgent(agentId: string): Promise<void>;
  getAgent(agentId: string): AgentInstance | null;
  listAgents(): AgentInstance[];

  startSession(
    agentId: string,
    initialContext?: Record<string, unknown>
  ): Promise<AgentSession>;
  sendMessage(
    agentId: string,
    message: string,
    sessionId?: string
  ): AsyncIterable<AIMessage>;
  stopSession(agentId: string, sessionId?: string): Promise<void>;

  triggerAgent(agentId: string, payload?: unknown): Promise<void>;
}
