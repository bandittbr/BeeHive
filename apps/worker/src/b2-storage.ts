import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const KEY_ID = String(process.env.B2_KEY_ID || '').trim();
const APP_KEY = String(process.env.B2_APPLICATION_KEY || '').trim();
const BUCKET_ID = String(process.env.B2_BUCKET_ID || '').trim();
const BUCKET_NAME = String(process.env.B2_BUCKET_NAME || '').trim();

type B2Auth = { authorizationToken: string; apiUrl: string; downloadUrl: string; expiresAt: number };
type B2File = { fileId: string; fileName: string; contentLength: number };
let cachedAuth: B2Auth | null = null;

export function isB2Configured(): boolean { return Boolean(KEY_ID && APP_KEY && BUCKET_ID && BUCKET_NAME); }
export function b2BucketName(): string { return BUCKET_NAME; }

async function authorize(): Promise<B2Auth> {
  if (!isB2Configured()) throw new Error('Backblaze ainda não está configurado no Railway.');
  if (cachedAuth && cachedAuth.expiresAt > Date.now() + 60_000) return cachedAuth;
  const basic = Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', { headers: { Authorization: `Basic ${basic}` } });
  if (!res.ok) throw new Error(`Falha ao autenticar no Backblaze (HTTP ${res.status}). Confira as variáveis B2 no Railway.`);
  const data = await res.json() as { authorizationToken: string; apiUrl: string; downloadUrl: string };
  cachedAuth = { ...data, expiresAt: Date.now() + 22 * 60 * 60_000 };
  return cachedAuth;
}

function apiName(key: string): string { return encodeURIComponent(key).replace(/%2F/g, '/'); }
async function api(pathname: string, body: Record<string, unknown>): Promise<Response> {
  const auth = await authorize();
  return fetch(`${auth.apiUrl}/b2api/v2/${pathname}`, { method: 'POST', headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function sha1File(filePath: string): Promise<string> {
  const hash = createHash('sha1');
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest('hex');
}

export async function uploadB2File(filePath: string, key: string, contentType = 'application/octet-stream'): Promise<B2File> {
  const uploadUrlResponse = await api('b2_get_upload_url', { bucketId: BUCKET_ID });
  if (!uploadUrlResponse.ok) throw new Error(`Backblaze não liberou upload (HTTP ${uploadUrlResponse.status}).`);
  const upload = await uploadUrlResponse.json() as { uploadUrl: string; authorizationToken: string };
  const stat = await fsp.stat(filePath);
  const sha1 = await sha1File(filePath);
  const response = await fetch(upload.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: upload.authorizationToken,
      'X-Bz-File-Name': apiName(key),
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'X-Bz-Content-Sha1': sha1,
    },
    body: fs.createReadStream(filePath) as any,
    duplex: 'half' as any,
  } as any);
  if (!response.ok) throw new Error(`Falha ao salvar no Backblaze (HTTP ${response.status}).`);
  const result = await response.json() as B2File;
  return result;
}

export async function downloadB2File(key: string, destination: string): Promise<void> {
  const auth = await authorize();
  const response = await fetch(`${auth.downloadUrl}/file/${encodeURIComponent(BUCKET_NAME)}/${apiName(key)}`, { headers: { Authorization: auth.authorizationToken } });
  if (!response.ok || !response.body) throw new Error(`Falha ao baixar mídia do Backblaze (HTTP ${response.status}).`);
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await pipeline(response.body as any, fs.createWriteStream(destination));
}

export async function getB2File(key: string): Promise<Response> {
  const auth = await authorize();
  const response = await fetch(`${auth.downloadUrl}/file/${encodeURIComponent(BUCKET_NAME)}/${apiName(key)}`, { headers: { Authorization: auth.authorizationToken } });
  if (!response.ok || !response.body) throw new Error(`Mídia não encontrada no Backblaze (HTTP ${response.status}).`);
  return response;
}

export async function deleteB2File(fileName: string, fileId: string): Promise<void> {
  const response = await api('b2_delete_file_version', { fileName, fileId });
  if (!response.ok) throw new Error(`Falha ao apagar mídia do Backblaze (HTTP ${response.status}).`);
}