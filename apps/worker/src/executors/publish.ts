// Executor de publicação. Publica um arquivo de vídeo do workspace direto nas
// redes via API oficial. Começa pelo YouTube (Data API v3, upload resumável).
// Autentica com OAuth2 usando refresh_token (o usuário cadastra as credenciais).
import fs from 'node:fs';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

type Chunk = (kind: 'stdout' | 'stderr', data: string) => void;

// Troca o refresh_token por um access_token válido.
async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !json.access_token) {
    throw new Error(`OAuth falhou: ${json.error_description || json.error || res.status}`);
  }
  return json.access_token as string;
}

// Publica no YouTube. payload:
//  file, title, description, tags[], privacyStatus (public|unlisted|private),
//  clientId, clientSecret, refreshToken.
export async function runPublishYoutube(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const p = req.payload as Record<string, any>;
  const file = String(p.file ?? '').trim();
  if (!file) throw new Error('publishYoutube: payload.file é obrigatório');

  const clientId = String(p.clientId ?? '').trim();
  const clientSecret = String(p.clientSecret ?? '').trim();
  const refreshToken = String(p.refreshToken ?? '').trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('publishYoutube: credenciais (clientId, clientSecret, refreshToken) são obrigatórias');
  }

  const dir = resolveInWorkspace(req.cwd ?? '.');
  const abs = path.join(dir, file);
  if (!fs.existsSync(abs)) throw new Error(`publishYoutube: arquivo não encontrado: ${file}`);

  const title = String(p.title ?? 'Novo vídeo').slice(0, 100);
  const description = String(p.description ?? '');
  const tags = Array.isArray(p.tags) ? p.tags.map((t: unknown) => String(t)).slice(0, 25) : [];
  const allowed = ['public', 'unlisted', 'private'];
  const privacyStatus = allowed.includes(String(p.privacyStatus)) ? String(p.privacyStatus) : 'private';

  onChunk('stdout', '→ Autenticando no YouTube...\n');
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

  const stat = fs.statSync(abs);
  const meta = {
    snippet: { title, description, tags, categoryId: '22' },
    status: { privacyStatus, selfDeclaredMadeForKids: false },
  };

  onChunk('stdout', '→ Iniciando upload resumável...\n');
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-length': String(stat.size),
        'x-upload-content-type': 'video/mp4',
      },
      body: JSON.stringify(meta),
    },
  );
  if (!initRes.ok) {
    const t = await initRes.text().catch(() => '');
    throw new Error(`início do upload falhou (${initRes.status}): ${t.slice(0, 300)}`);
  }
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('início do upload: resposta sem header Location');

  onChunk('stdout', `→ Enviando ${(stat.size / 1e6).toFixed(1)} MB...\n`);
  const bytes = fs.readFileSync(abs);
  const upRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'video/mp4' },
    body: bytes,
  });
  const upJson = (await upRes.json().catch(() => ({}))) as any;
  if (!upRes.ok || !upJson.id) {
    throw new Error(`upload falhou (${upRes.status}): ${upJson?.error?.message || 'erro desconhecido'}`);
  }

  const videoId = String(upJson.id);
  const link = `https://youtu.be/${videoId}`;
  onChunk('stdout', `✓ Publicado no YouTube: ${link} (${privacyStatus})\n`);
  return { result: { platform: 'youtube', videoId, url: link, privacyStatus } };
}
