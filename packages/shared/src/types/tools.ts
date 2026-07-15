export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  required?: string[];
  category: ToolCategory;
  permissions?: string[];
  timeout?: number;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export type ToolCategory =
  | 'filesystem'
  | 'terminal'
  | 'git'
  | 'browser'
  | 'web'
  | 'database'
  | 'email'
  | 'communication'
  | 'ai'
  | 'media'
  | 'system'
  | 'custom';

export interface ToolExecutionRequest {
  name: string;
  arguments: Record<string, unknown>;
  context?: ToolContext;
}

export interface ToolContext {
  agentId?: string;
  userId?: string;
  workspaceId?: string;
  conversationId?: string;
  abortSignal?: AbortSignal;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    duration: number;
    toolCalls?: number;
    bytesRead?: number;
    bytesWritten?: number;
  };
}

export interface ITool {
  readonly definition: ToolDefinition;
  execute(
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolExecutionResult>;
  validate?(args: Record<string, unknown>): string[];
}

export interface IToolRegistry {
  register(tool: ITool): void;
  unregister(toolName: string): void;
  get(toolName: string): ITool | undefined;
  list(category?: ToolCategory): ToolDefinition[];
  getAll(): Map<string, ITool>;
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}
