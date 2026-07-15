export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  duration?: number;
  correlationId?: string;
  userId?: string;
  error?: { message: string; stack?: string };
  metadata?: Record<string, unknown>;
}

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;

  child(context: Record<string, unknown>): ILogger;
  setLevel(level: LogLevel): void;

  flush(): Promise<void>;
}
