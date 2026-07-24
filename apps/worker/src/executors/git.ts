// Executor git — atalho sobre o shell, com allowlist de subcomandos.
import { runShell } from './shell.js';
import type { JobRequest } from '../types.js';

const ALLOWED = new Set([
  'clone', 'init', 'add', 'commit', 'push', 'pull', 'fetch',
  'checkout', 'switch', 'branch', 'status', 'log', 'remote', 'config', 'tag',
]);

export async function runGit(
  req: JobRequest,
  onChunk: (kind: 'stdout' | 'stderr', data: string) => void,
): Promise<{ exitCode: number; result: { exitCode: number } }> {
  const args = String(req.payload.args ?? '').trim();
  const sub = args.split(/\s+/)[0];
  if (!ALLOWED.has(sub)) throw new Error(`git: subcomando não permitido: ${sub || '(vazio)'}`);
  return runShell({ ...req, payload: { command: `git ${args}` } }, onChunk);
}
