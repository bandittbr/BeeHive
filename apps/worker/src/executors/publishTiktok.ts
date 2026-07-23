// Publicação no TikTok (Content Posting API).
// Exporta: refreshTiktok (troca refresh_token por access_token, retornando o
// novo refresh rotacionado), publishTiktokWithToken (publica com access_token já
// válido) e runPublishTiktok (caminho por credencial: refresh + publish).
import fs from 'node:fs';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

type Chunk = (kind: 'stdout' | 'stderr', data: string) => void;

const API = 'https://open.tiktokapis.com/v2';

export interface TiktokTokens { accessToken: string; refreshToken?: string; expiresIn?: number; }

export async function refreshTiktok(clientKey: string, clientSecret: string, refreshToken: string): Promise<TiktokTokens> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !j.access_token) throw new Error(`OAuth TikTok falhou: ${j.error_description || j.error || res.status}`);
  return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: j.expires_in };
}

async function apiJson(urlPath: string, accessToken: string, body: unknown): Promise<any> {
  const res = await fetch(`${API}${urlPath}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  const err = json?.error;
  if (!res.ok || (err && err.code && err.code !== 'ok')) throw new Error(err?.message || `TikTok HTTP ${res.status}`);
  return json;
}

export async function publishTiktokWithToken(
  accessToken: string,
  opts: { file: string; title?: string; privacyLevel?: string; cwd?: string },
  onChunk: Chunk,
): Promise<{ platform: string; id: string; url?: string; privacyLevel: string }> {
  const allowed = ['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR'];
  const privacyLevel = allowed.includes(String(opts.privacyLevel)) ? String(opts.privacyLevel) : 'SELF_ONLY';
  const title = String(opts.title ?? '').slice(0, 2200);

  const dir = resolveInWorkspace(opts.cwd ?? '.');
  const abs = path.join(dir, opts.file);
  if (!fs.existsSync(abs)) throw new Error(`tiktok: arquivo não encontrado: ${opts.file}`);
  const size = fs.statSync(abs).size;

  onChunk('stdout', '→ Iniciando upload...\n');
  const init = await apiJson('/post/publish/video/init/', accessToken, {
    post_info: { title, privacy_level: privacyLevel, disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000 },
    source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 },
  });
  const publishId = String(init?.data?.publish_id ?? '');
  const uploadUrl = String(init?.data?.upload_url ?? '');
  if (!publishId || !uploadUrl) throw new Error('tiktok: init sem publish_id/upload_url');

  onChunk('stdout', `→ Enviando ${(size / 1e6).toFixed(1)} MB...\n`);
  const bytes = fs.readFileSync(abs);
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size), 'content-range': `bytes 0-${size - 1}/${size}` }, body: bytes });
  if (!put.ok) { const t = await put.text().catch(() => ''); throw new Error(`tiktok: upload falhou (${put.status}): ${t.slice(0, 200)}`); }

  onChunk('stdout', '→ Processando no TikTok...\n');
  const started = Date.now();
  let done = false; let postId = '';
  while (Date.now() - started < 300000) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await apiJson('/post/publish/status/fetch/', accessToken, { publish_id: publishId });
    const status = String(st?.data?.status ?? '');
    if (status === 'PUBLISH_COMPLETE') { done = true; const ids = st?.data?.publicaly_available_post_id; if (Array.isArray(ids) && ids.length) postId = String(ids[0]); break; }
    if (status === 'FAILED') throw new Error(`tiktok: publicação falhou (${st?.data?.fail_reason || 'FAILED'})`);
  }
  if (!done) throw new Error('tiktok: timeout no processamento');

  const url = postId ? `https://www.tiktok.com/video/${postId}` : undefined;
  onChunk('stdout', `✓ Publicado no TikTok${url ? `: ${url}` : ` (${privacyLevel})`}\n`);
  return { platform: 'tiktok', id: postId || publishId, url, privacyLevel };
}

// Caminho por credencial (clientKey/secret/refreshToken no payload).
export async function runPublishTiktok(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const p = req.payload as Record<string, any>;
  const file = String(p.file ?? '').trim();
  const clientKey = String(p.clientKey ?? '').trim();
  const clientSecret = String(p.clientSecret ?? '').trim();
  const refreshToken = String(p.refreshToken ?? '').trim();
  if (!file || !clientKey || !clientSecret || !refreshToken) throw new Error('tiktok: file, clientKey, clientSecret e refreshToken são obrigatórios');
  onChunk('stdout', '→ Autenticando no TikTok...\n');
  const tok = await refreshTiktok(clientKey, clientSecret, refreshToken);
  const result = await publishTiktokWithToken(tok.accessToken, { file, title: String(p.title ?? ''), privacyLevel: p.privacyLevel, cwd: req.cwd }, onChunk);
  return { result };
}
