export class Logger {
  info(msg: string, meta?: Record<string, unknown>): void { console.log(`[INFO] ${msg}`, meta ?? ''); }
  warn(msg: string, meta?: Record<string, unknown>): void { console.warn(`[WARN] ${msg}`, meta ?? ''); }
  error(msg: string, meta?: Record<string, unknown>): void { console.error(`[ERROR] ${msg}`, meta ?? ''); }
  debug(msg: string, meta?: Record<string, unknown>): void { console.debug(`[DEBUG] ${msg}`, meta ?? ''); }
  child(context: Record<string, unknown>): Logger { return this; }
}
