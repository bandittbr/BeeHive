/**
 * Shared debug log ring buffer.
 * Used by all executors to log events visible via GET /api/debug/logs.
 */

const _logs: string[] = [];
const MAX = 500;

export function debugLog(msg: string): void {
  const ts = new Date().toISOString().slice(11, 23);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  _logs.push(line);
  if (_logs.length > MAX) _logs.splice(0, _logs.length - MAX);
}

export function getDebugLogs(): string[] {
  return [..._logs];
}
