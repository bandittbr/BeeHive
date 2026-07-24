// Executor de terminal. Roda um comando e faz streaming de stdout/stderr.
import { spawn } from 'node:child_process';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

export interface ExecOutcome {
  exitCode: number;
  result: { exitCode: number };
}

// Comandos bloqueados por segurança básica (evita destruir a máquina do worker).
const BLOCKED = [/\brm\s+-rf\s+\/(?:\s|$)/, /\bmkfs\b/, /\b:\(\)\s*\{/, /\bshutdown\b/, /\breboot\b/];

export async function runShell(
  req: JobRequest,
  onChunk: (kind: 'stdout' | 'stderr', data: string) => void,
): Promise<ExecOutcome> {
  const command = String(req.payload.command ?? '').trim();
  if (!command) throw new Error('shell: payload.command é obrigatório');
  if (BLOCKED.some((re) => re.test(command))) throw new Error('shell: comando bloqueado por segurança');

  const cwd = resolveInWorkspace(req.cwd ?? '.');
  const timeoutMs = Number(req.payload.timeoutMs ?? 120000);

  return new Promise<ExecOutcome>((resolve, reject) => {
    const child = spawn('bash', ['-lc', command], { cwd, env: process.env });
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => onChunk('stdout', d.toString()));
    child.stderr.on('data', (d) => onChunk('stderr', d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return reject(new Error(`shell: timeout após ${timeoutMs}ms`));
      const exitCode = code ?? 0;
      resolve({ exitCode, result: { exitCode } });
    });
  });
}
