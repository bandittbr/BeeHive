export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameter[];
  readonly required: string[];
  readonly category: ToolCategory;

  execute(args: Record<string, unknown>, ctx: { userId?: string; abortSignal?: AbortSignal }): Promise<ToolResult>;
  validate(args: Record<string, unknown>): string[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export type ToolCategory = 'filesystem' | 'terminal' | 'git' | 'browser' | 'web' | 'database' | 'ai' | 'system';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}
