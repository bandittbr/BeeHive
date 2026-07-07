import type { ILogger, LogEntry, LogLevel } from './types';

/**
 * Logger centralizado.
 *
 * Responsabilidade única: registrar logs. Escreve no console e mantém um
 * histórico limitado em memória (consumido futuramente por Central, Dashboard
 * e Auditoria). Loggers-filhos (por escopo) compartilham o mesmo histórico.
 *
 * Deliberadamente NÃO emite eventos, para evitar ciclo com a auditoria de
 * eventos do Kernel (evento → log → evento → ...).
 */
export class Logger implements ILogger {
  private readonly own: LogEntry[] = [];

  constructor(
    private readonly scope: string = 'kernel',
    private readonly maxEntries: number = 500,
    private readonly shared?: LogEntry[],
  ) {}

  private store(): LogEntry[] {
    return this.shared ?? this.own;
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = { level, scope: this.scope, message, context, timestamp: Date.now() };
    const store = this.store();
    store.push(entry);
    if (store.length > this.maxEntries) store.shift();

    const line = `[BeeHive:${this.scope}] ${message}`;
    if (level === 'error') console.error(line, context ?? '');
    else if (level === 'warn') console.warn(line, context ?? '');
    else console.log(line, context ?? '');
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context);
  }
  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }
  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }
  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context);
  }

  child(scope: string): ILogger {
    return new Logger(`${this.scope}:${scope}`, this.maxEntries, this.store());
  }

  getEntries(): readonly LogEntry[] {
    return [...this.store()];
  }
}
