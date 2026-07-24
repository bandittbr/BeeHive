export interface IExecutionContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly userId?: string;
  readonly workspaceId?: string;
  readonly projectId?: string;
  readonly workflowId?: string;
  readonly workflowInstanceId?: string;
  readonly agentId?: string;
  readonly agentSessionId?: string;
  readonly permissions: string[];
  readonly memoryScope: string;
  readonly startedAt: number;

  log: IExecutionLogger;
  metrics: IExecutionMetrics;
}

export interface IExecutionLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export interface IExecutionMetrics {
  increment(counter: string, value?: number): void;
  timing(metric: string, duration: number): void;
  gauge(metric: string, value: number): void;
  snapshot(): Record<string, number>;
}

export interface IContextFactory {
  create(options: ContextOptions): IExecutionContext;
  get(requestId: string): IExecutionContext | null;
}

export interface ContextOptions {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  workflowId?: string;
  agentId?: string;
  permissions?: string[];
}
