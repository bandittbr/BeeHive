// Executores de publicação da Meta (Instagram Reels + Facebook Page vídeo).
// Ambos usam a Graph API e precisam de uma URL pública do vídeo — servida pelo
// próprio worker em /files. Defina WORKER_PUBLIC_URL (a URL do worker no Railway).
import fs from 'node:fs';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

type Chunk = (kind: 'stdout' | 'stderr', data: string) => void;

const GRAPH = 'https://graph.facebook.com/v21.0';

// Monta a URL pública do arquivo no próprio worker (Meta vai baixar de lá).
function publicFileUrl(file: string): string {
  const base = (process.env.WORKER_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (!base) throw new Error('WORKER_PUBLIC_URL não configurado (URL pública do worker, ex: https://...up.railway.app)');
  const token = process.env.WORKER_TOKEN ?? '';
  const q = token ? `?t=${encodeURIComponent(token)}` : '';
  return `${base}/files/${encodeURIComponent(file)}${q}`;
}

function ensureFile(file: string, cwd?: string): void {
  const dir = resolveInWorkspace(cwd ?? '.');
  if (!fs.existsSync(path.join(dir, file))) throw new Error(`arquivo não encontrado no worker: ${file}`);
}

async function graph(method: 'GET' | 'POST', urlPath: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const url = `${GRAPH}/${urlPath}?${qs}`;
  const res = await fetch(url, { method });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || json?.error) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// Instagram Reels: cria container → espera processar → publica.
export async function runPublishInstagram(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const p = req.payload as Record<string, any>;
  const file = String(p.file ?? '').trim();
  const igUserId = String(p.igUserId ?? '').trim();
  const accessToken = String(p.accessToken ?? '').trim();
  if (!file || !igUserId || !accessToken) throw new Error('instagram: file, igUserId e accessToken são obrigatórios');
  ensureFile(file, req.cwd);

  const caption = String(p.caption ?? '');
  const videoUrl = publicFileUrl(file);

  onChunk('stdout', '→ Criando container do Reel...\n');
  const container = await graph('POST', `${igUserId}/media`, {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    access_token: accessToken,
  });
  const creationId = String(container.id);

  // aguarda o processamento (Meta baixa e transcodifica o vídeo)
  onChunk('stdout', '→ Processando vídeo na Meta...\n');
  const started = Date.now();
  let ready = false;
  while (Date.now() - started < 300000) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await graph('GET', creationId, { fields: 'status_code', access_token: accessToken });
    const code = st.status_code;
    if (code === 'FINISHED') { ready = true; break; }
    if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`processamento falhou: ${code}`);
  }
  if (!ready) throw new Error('timeout no processamento do Reel');

  onChunk('stdout', '→ Publicando...\n');
  const pub = await graph('POST', `${igUserId}/media_publish`, { creation_id: creationId, access_token: accessToken });
  const mediaId = String(pub.id);

  let link = '';
  try {
    const info = await graph('GET', mediaId, { fields: 'permalink', access_token: accessToken });
    link = info.permalink || '';
  } catch { /* opcional */ }

  onChunk('stdout', `✓ Publicado no Instagram${link ? `: ${link}` : ''}\n`);
  return { result: { platform: 'instagram', id: mediaId, url: link || undefined } };
}

// Facebook: publica vídeo na Página a partir da URL pública.
export async function runPublishFacebook(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const p = req.payload as Record<string, any>;
  const file = String(p.file ?? '').trim();
  const pageId = String(p.pageId ?? '').trim();
  const accessToken = String(p.accessToken ?? '').trim();
  if (!file || !pageId || !accessToken) throw new Error('facebook: file, pageId e accessToken são obrigatórios');
  ensureFile(file, req.cwd);

  const description = String(p.caption ?? '');
  const videoUrl = publicFileUrl(file);

  onChunk('stdout', '→ Enviando vídeo para a Página...\n');
  const out = await graph('POST', `${pageId}/videos`, {
    file_url: videoUrl,
    description,
    access_token: accessToken,
  });
  const id = String(out.id);
  const link = `https://www.facebook.com/${id}`;
  onChunk('stdout', `✓ Publicado no Facebook: ${link}\n`);
  return { result: { platform: 'facebook', id, url: link } };
}
