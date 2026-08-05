// Resolução segura de caminhos: tudo fica confinado ao diretório WORKSPACE.
// Impede path traversal (../) para fora da raiz do worker.
import path from 'node:path';
import fs from 'node:fs';

const mountedWorkerWorkspace = path.resolve(process.cwd(), 'apps', 'worker', 'workspace');

// Em produção o Railway monta o volume em /app/apps/worker/workspace.
// Em desenvolvimento mantemos o diretório workspace relativo ao processo.
export const WORKSPACE_ROOT = process.env.WORKSPACE_DIR
  ? path.resolve(process.env.WORKSPACE_DIR)
  : fs.existsSync(mountedWorkerWorkspace)
    ? mountedWorkerWorkspace
    : path.resolve(process.cwd(), 'workspace');

export function ensureWorkspace(): void {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

/** Resolve um caminho relativo dentro do workspace, bloqueando escapes. */
export function resolveInWorkspace(relative = '.'): string {
  const abs = path.resolve(WORKSPACE_ROOT, relative);
  const rootWithSep = WORKSPACE_ROOT.endsWith(path.sep) ? WORKSPACE_ROOT : WORKSPACE_ROOT + path.sep;
  if (abs !== WORKSPACE_ROOT && !abs.startsWith(rootWithSep)) {
    throw new Error(`Caminho fora do workspace não permitido: ${relative}`);
  }
  return abs;
}
