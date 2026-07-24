// Executores de arquivo: escrever e ler dentro do workspace.
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

export async function writeFile(req: JobRequest): Promise<{ result: { path: string; bytes: number } }> {
  const rel = String(req.payload.path ?? '').trim();
  if (!rel) throw new Error('writeFile: payload.path é obrigatório');
  const content = String(req.payload.content ?? '');
  const abs = resolveInWorkspace(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
  return { result: { path: rel, bytes: Buffer.byteLength(content, 'utf8') } };
}

export async function readFile(req: JobRequest): Promise<{ result: { path: string; content: string } }> {
  const rel = String(req.payload.path ?? '').trim();
  if (!rel) throw new Error('readFile: payload.path é obrigatório');
  const abs = resolveInWorkspace(rel);
  const content = await fs.readFile(abs, 'utf8');
  return { result: { path: rel, content } };
}
