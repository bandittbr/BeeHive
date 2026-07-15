export interface CommandEnvelope<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  payload: T;
  correlationId?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: { duration: number };
}

export type CommandHandler<T = unknown, R = unknown> = (
  command: CommandEnvelope<T>,
  ctx: CommandContext
) => Promise<R>;

export interface CommandContext {
  kernelId: string;
  dispatch<T>(type: string, payload: T): Promise<unknown>;
  emit(event: string, payload: unknown): void;
}

export interface CommandSubscription {
  id: string;
  commandType: string;
  handler: CommandHandler;
}

export interface ICommandBus {
  dispatch<T>(type: string, payload: T, options?: DispatchOptions): Promise<unknown>;
  on<T, R>(commandType: string, handler: CommandHandler<T, R>): CommandSubscription;
  off(subscription: CommandSubscription): void;
  getHandlers(): string[];
}

export interface DispatchOptions {
  source?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}
