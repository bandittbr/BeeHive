// Armazenamento do worker: fila de posts agendados + credenciais das redes.
// Usa Supabase (REST/PostgREST com service_role) quando SUPABASE_URL e
// SUPABASE_SERVICE_KEY estão definidos; senão cai num arquivo JSON no workspace.
// A API é assíncrona para funcionar igual nos dois modos.
import fs from 'node:fs';
import path from 'node:path';
import { WORKSPACE_ROOT } from './workspace.js';

export type PlatformId = 'youtube' | 'instagram' | 'facebook' | 'tiktok';

export interface YoutubeCreds {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
}

export interface ScheduledPost {
  id: string;
  platform: PlatformId;
  file: string;
  title: string;
  description: string;
  tags: string[];
  at: number; // epoch ms em que deve ser publicado
  status: 'pending' | 'publishing' | 'done' | 'error';
  url?: string;
  error?: string;
  createdAt: number;
}

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const useSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

export function storageMode(): 'supabase' | 'file' {
  return useSupabase ? 'supabase' : 'file';
}

// ---------- Supabase (PostgREST) ----------
function sbHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    authorization: `Bearer ${SUPABASE_KEY}`,
    'content-type': 'application/json',
    ...extra,
  };
}
const CREDS = `${SUPABASE_URL}/rest/v1/beehive_youtube_creds`;
const PCREDS = `${SUPABASE_URL}/rest/v1/beehive_platform_creds`;
const POSTS = `${SUPABASE_URL}/rest/v1/beehive_posts`;

function rowToPost(r: any): ScheduledPost {
  return {
    id: String(r.id),
    platform: (r.platform ?? 'youtube') as PlatformId,
    file: r.file,
    title: r.title ?? '',
    description: r.description ?? '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    at: Number(r.at),
    status: r.status,
    url: r.url ?? undefined,
    error: r.error ?? undefined,
    createdAt: Number(r.created_at),
  };
}

// ---------- Arquivo (fallback) ----------
const FILE = path.join(WORKSPACE_ROOT, '.beehive-store.json');
interface FileData { youtube?: YoutubeCreds; platformCreds?: Record<string, Record<string, unknown>>; posts: ScheduledPost[]; }
function fileLoad(): FileData {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8')) as FileData;
    if (!Array.isArray(d.posts)) d.posts = [];
    return d;
  } catch {
    return { posts: [] };
  }
}
function fileSave(d: FileData): void {
  try {
    fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(d, null, 2), 'utf8');
  } catch { /* ignore */ }
}

// ---------- YouTube creds ----------
export async function getYoutubeCreds(): Promise<YoutubeCreds | null> {
  if (useSupabase) {
    const res = await fetch(`${CREDS}?id=eq.1&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    const r = rows[0];
    if (!r) return null;
    return { clientId: r.client_id, clientSecret: r.client_secret, refreshToken: r.refresh_token, privacyStatus: r.privacy_status };
  }
  return fileLoad().youtube ?? null;
}

export async function setYoutubeCreds(c: YoutubeCreds): Promise<void> {
  if (useSupabase) {
    await fetch(CREDS, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: 1, client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, privacy_status: c.privacyStatus ?? 'public', updated_at: new Date().toISOString() }),
    });
    return;
  }
  const d = fileLoad();
  d.youtube = c;
  fileSave(d);
}

export async function hasYoutubeCreds(): Promise<boolean> {
  const c = await getYoutubeCreds();
  return !!(c && c.clientId && c.clientSecret && c.refreshToken);
}

// ---------- Credenciais genéricas por rede (instagram/facebook/tiktok) ----------
export async function getPlatformCreds(platform: string): Promise<Record<string, unknown> | null> {
  if (useSupabase) {
    const res = await fetch(`${PCREDS}?platform=eq.${encodeURIComponent(platform)}&select=data`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0]?.data ?? null;
  }
  return fileLoad().platformCreds?.[platform] ?? null;
}

export async function setPlatformCreds(platform: string, data: Record<string, unknown>): Promise<void> {
  if (useSupabase) {
    await fetch(PCREDS, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ platform, data, updated_at: new Date().toISOString() }),
    });
    return;
  }
  const d = fileLoad();
  d.platformCreds = d.platformCreds ?? {};
  d.platformCreds[platform] = data;
  fileSave(d);
}

export async function hasPlatformCreds(platform: string): Promise<boolean> {
  const c = await getPlatformCreds(platform);
  return !!c && Object.keys(c).length > 0;
}

// ---------- Posts ----------
export async function listPosts(): Promise<ScheduledPost[]> {
  if (useSupabase) {
    const res = await fetch(`${POSTS}?select=*&order=at.asc`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToPost);
  }
  return fileLoad().posts.slice().sort((a, b) => a.at - b.at);
}

export async function getDuePosts(now: number): Promise<ScheduledPost[]> {
  if (useSupabase) {
    const res = await fetch(`${POSTS}?select=*&status=eq.pending&at=lte.${now}&order=at.asc`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToPost);
  }
  return fileLoad().posts.filter((p) => p.status === 'pending' && p.at <= now);
}

export async function addPost(p: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'>): Promise<ScheduledPost> {
  const post: ScheduledPost = { ...p, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, status: 'pending', createdAt: Date.now() };
  if (useSupabase) {
    await fetch(POSTS, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({ id: post.id, platform: post.platform, file: post.file, title: post.title, description: post.description, tags: post.tags, at: post.at, status: post.status, created_at: post.createdAt }),
    });
    return post;
  }
  const d = fileLoad();
  d.posts.push(post);
  fileSave(d);
  return post;
}

export async function updatePost(id: string, fields: Partial<Pick<ScheduledPost, 'status' | 'url' | 'error'>>): Promise<void> {
  if (useSupabase) {
    await fetch(`${POSTS}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify(fields),
    });
    return;
  }
  const d = fileLoad();
  const p = d.posts.find((x) => x.id === id);
  if (p) { Object.assign(p, fields); fileSave(d); }
}

export async function removePost(id: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${POSTS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = fileLoad();
  const before = d.posts.length;
  d.posts = d.posts.filter((x) => x.id !== id);
  fileSave(d);
  return d.posts.length < before;
}
