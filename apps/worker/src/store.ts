// Armazenamento do worker: fila de posts + credenciais + contas OAuth conectadas.
// Usa Supabase (PostgREST/service_role) quando configurado; senão arquivo JSON.
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
  at: number;
  status: 'pending' | 'publishing' | 'done' | 'error';
  url?: string;
  error?: string;
  createdAt: number;
  accountId?: string;
}

export interface OauthApp {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scopes?: string;
}

export interface ConnectedAccount {
  id: string;            // `${platform}:${accountId}`
  platform: string;
  accountId: string;
  displayName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  extra?: Record<string, unknown>;
}

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const useSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

export function storageMode(): 'supabase' | 'file' {
  return useSupabase ? 'supabase' : 'file';
}

function sbHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, 'content-type': 'application/json', ...extra };
}
const CREDS = `${SUPABASE_URL}/rest/v1/beehive_youtube_creds`;
const PCREDS = `${SUPABASE_URL}/rest/v1/beehive_platform_creds`;
const POSTS = `${SUPABASE_URL}/rest/v1/beehive_posts`;
const OAUTH = `${SUPABASE_URL}/rest/v1/beehive_oauth_apps`;
const ACCOUNTS = `${SUPABASE_URL}/rest/v1/beehive_accounts`;

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
    accountId: r.account_id ?? undefined,
  };
}
function rowToAccount(r: any): ConnectedAccount {
  return {
    id: String(r.id),
    platform: r.platform,
    accountId: r.account_id,
    displayName: r.display_name ?? undefined,
    accessToken: r.access_token ?? undefined,
    refreshToken: r.refresh_token ?? undefined,
    expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
    extra: r.extra ?? undefined,
  };
}

// ---------- arquivo (fallback) ----------
const FILE = path.join(WORKSPACE_ROOT, '.beehive-store.json');
interface FileData {
  youtube?: YoutubeCreds;
  platformCreds?: Record<string, Record<string, unknown>>;
  oauthApps?: Record<string, OauthApp>;
  accounts?: Record<string, ConnectedAccount>;
  posts: ScheduledPost[];
}
function fileLoad(): FileData {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, 'utf8')) as FileData;
    if (!Array.isArray(d.posts)) d.posts = [];
    return d;
  } catch { return { posts: [] }; }
}
function fileSave(d: FileData): void {
  try { fs.mkdirSync(WORKSPACE_ROOT, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2), 'utf8'); } catch { /* ignore */ }
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
    await fetch(CREDS, { method: 'POST', headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: 1, client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, privacy_status: c.privacyStatus ?? 'public', updated_at: new Date().toISOString() }) });
    return;
  }
  const d = fileLoad(); d.youtube = c; fileSave(d);
}
export async function hasYoutubeCreds(): Promise<boolean> {
  const c = await getYoutubeCreds();
  return !!(c && c.clientId && c.clientSecret && c.refreshToken);
}

// ---------- creds genéricas por rede ----------
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
    await fetch(PCREDS, { method: 'POST', headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ platform, data, updated_at: new Date().toISOString() }) });
    return;
  }
  const d = fileLoad(); d.platformCreds = d.platformCreds ?? {}; d.platformCreds[platform] = data; fileSave(d);
}
export async function hasPlatformCreds(platform: string): Promise<boolean> {
  const c = await getPlatformCreds(platform);
  return !!c && Object.keys(c).length > 0;
}

// ---------- OAuth apps ----------
export async function getOauthApp(platform: string): Promise<OauthApp | null> {
  if (useSupabase) {
    const res = await fetch(`${OAUTH}?platform=eq.${encodeURIComponent(platform)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    const r = rows[0];
    if (!r) return null;
    return { clientId: r.client_id, clientSecret: r.client_secret, redirectUri: r.redirect_uri ?? undefined, scopes: r.scopes ?? undefined };
  }
  return fileLoad().oauthApps?.[platform] ?? null;
}
export async function setOauthApp(platform: string, app: OauthApp): Promise<void> {
  if (useSupabase) {
    await fetch(OAUTH, { method: 'POST', headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ platform, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: app.redirectUri ?? null, scopes: app.scopes ?? null, updated_at: new Date().toISOString() }) });
    return;
  }
  const d = fileLoad(); d.oauthApps = d.oauthApps ?? {}; d.oauthApps[platform] = app; fileSave(d);
}
export async function hasOauthApp(platform: string): Promise<boolean> {
  const a = await getOauthApp(platform);
  return !!(a && a.clientId && a.clientSecret);
}

// ---------- Contas conectadas ----------
export async function listAccounts(platform?: string): Promise<ConnectedAccount[]> {
  if (useSupabase) {
    const q = platform ? `?platform=eq.${encodeURIComponent(platform)}&select=*&order=created_at.asc` : `?select=*&order=created_at.asc`;
    const res = await fetch(`${ACCOUNTS}${q}`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToAccount);
  }
  const all = Object.values(fileLoad().accounts ?? {});
  return platform ? all.filter((a) => a.platform === platform) : all;
}
export async function getAccount(id: string): Promise<ConnectedAccount | null> {
  if (useSupabase) {
    const res = await fetch(`${ACCOUNTS}?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToAccount(rows[0]) : null;
  }
  return fileLoad().accounts?.[id] ?? null;
}
export async function upsertAccount(a: ConnectedAccount): Promise<void> {
  const now = Date.now();
  if (useSupabase) {
    await fetch(ACCOUNTS, { method: 'POST', headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id: a.id, platform: a.platform, account_id: a.accountId, display_name: a.displayName ?? null,
        access_token: a.accessToken ?? null, refresh_token: a.refreshToken ?? null, expires_at: a.expiresAt ?? null, extra: a.extra ?? {}, created_at: now, updated_at: now }) });
    return;
  }
  const d = fileLoad(); d.accounts = d.accounts ?? {}; d.accounts[a.id] = a; fileSave(d);
}
export async function updateAccountTokens(id: string, fields: { accessToken?: string; refreshToken?: string; expiresAt?: number }): Promise<void> {
  if (useSupabase) {
    const body: Record<string, unknown> = { updated_at: Date.now() };
    if (fields.accessToken !== undefined) body.access_token = fields.accessToken;
    if (fields.refreshToken !== undefined) body.refresh_token = fields.refreshToken;
    if (fields.expiresAt !== undefined) body.expires_at = fields.expiresAt;
    await fetch(`${ACCOUNTS}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: sbHeaders({ prefer: 'return=minimal' }), body: JSON.stringify(body) });
    return;
  }
  const d = fileLoad(); const a = d.accounts?.[id];
  if (a) { Object.assign(a, fields); fileSave(d); }
}
export async function removeAccount(id: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${ACCOUNTS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = fileLoad(); if (d.accounts?.[id]) { delete d.accounts[id]; fileSave(d); return true; } return false;
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
    await fetch(POSTS, { method: 'POST', headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({ id: post.id, platform: post.platform, file: post.file, title: post.title, description: post.description, tags: post.tags, at: post.at, status: post.status, created_at: post.createdAt, account_id: post.accountId ?? null }) });
    return post;
  }
  const d = fileLoad(); d.posts.push(post); fileSave(d); return post;
}
export async function updatePost(id: string, fields: Partial<Pick<ScheduledPost, 'status' | 'url' | 'error'>>): Promise<void> {
  if (useSupabase) {
    await fetch(`${POSTS}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: sbHeaders({ prefer: 'return=minimal' }), body: JSON.stringify(fields) });
    return;
  }
  const d = fileLoad(); const p = d.posts.find((x) => x.id === id); if (p) { Object.assign(p, fields); fileSave(d); }
}
export async function removePost(id: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${POSTS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = fileLoad(); const before = d.posts.length; d.posts = d.posts.filter((x) => x.id !== id); fileSave(d); return d.posts.length < before;
}

// ---------- Usuários (login) + Providers de IA por usuário (BYOK) ----------
export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  currentProviderId?: string;
  currentModel?: string;
}
export interface ProviderRow {
  id: string;
  userId: string;
  providerType: string;
  name: string;
  encryptedKey: string;
  keyIv: string;
  keyTag: string;
  baseUrl?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastTestedAt?: string;
  lastTestedError?: string;
  models: unknown[];
  createdAt: string;
  updatedAt: string;
}

const USERS = `${SUPABASE_URL}/rest/v1/beehive_users`;
const PROVIDERS = `${SUPABASE_URL}/rest/v1/beehive_providers`;

function rowToUser(r: any): UserRow {
  return {
    id: String(r.id),
    email: r.email,
    passwordHash: r.password_hash,
    passwordSalt: r.password_salt,
    currentProviderId: r.current_provider_id ?? undefined,
    currentModel: r.current_model ?? undefined,
  };
}
function rowToProvider(r: any): ProviderRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    providerType: r.provider_type,
    name: r.name,
    encryptedKey: r.encrypted_key,
    keyIv: r.key_iv,
    keyTag: r.key_tag,
    baseUrl: r.base_url ?? undefined,
    status: r.status,
    lastTestedAt: r.last_tested_at ?? undefined,
    lastTestedError: r.last_tested_error ?? undefined,
    models: Array.isArray(r.models) ? r.models : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// arquivo (fallback, uso local/dev sem Supabase)
interface AuthFileData { users: UserRow[]; providers: ProviderRow[] }
const AUTH_FILE = path.join(WORKSPACE_ROOT, '.beehive-auth.json');
function authFileLoad(): AuthFileData {
  try {
    const d = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) as AuthFileData;
    if (!Array.isArray(d.users)) d.users = [];
    if (!Array.isArray(d.providers)) d.providers = [];
    return d;
  } catch { return { users: [], providers: [] }; }
}
function authFileSave(d: AuthFileData): void {
  try { fs.mkdirSync(WORKSPACE_ROOT, { recursive: true }); fs.writeFileSync(AUTH_FILE, JSON.stringify(d, null, 2), 'utf8'); } catch { /* ignore */ }
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  if (useSupabase) {
    const res = await fetch(`${USERS}?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToUser(rows[0]) : null;
  }
  return authFileLoad().users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  if (useSupabase) {
    const res = await fetch(`${USERS}?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToUser(rows[0]) : null;
  }
  return authFileLoad().users.find((u) => u.id === id) ?? null;
}

export async function createUser(email: string, passwordHash: string, passwordSalt: string): Promise<UserRow> {
  const normalizedEmail = email.toLowerCase();
  if (useSupabase) {
    const res = await fetch(USERS, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'return=representation' }),
      body: JSON.stringify({ email: normalizedEmail, password_hash: passwordHash, password_salt: passwordSalt }),
    });
    if (!res.ok) throw new Error(`Falha ao criar usuário: HTTP ${res.status}`);
    const rows = (await res.json()) as any[];
    return rowToUser(rows[0]);
  }
  const d = authFileLoad();
  const user: UserRow = { id: crypto.randomUUID(), email: normalizedEmail, passwordHash, passwordSalt };
  d.users.push(user);
  authFileSave(d);
  return user;
}

export async function setCurrentSelection(userId: string, providerId: string | null, model: string | null): Promise<void> {
  if (useSupabase) {
    await fetch(`${USERS}?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({ current_provider_id: providerId, current_model: model, updated_at: new Date().toISOString() }),
    });
    return;
  }
  const d = authFileLoad();
  const u = d.users.find((x) => x.id === userId);
  if (u) { u.currentProviderId = providerId ?? undefined; u.currentModel = model ?? undefined; authFileSave(d); }
}

export async function listProviders(userId: string): Promise<ProviderRow[]> {
  if (useSupabase) {
    const res = await fetch(`${PROVIDERS}?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToProvider);
  }
  return authFileLoad().providers.filter((p) => p.userId === userId);
}

export async function getProvider(id: string, userId: string): Promise<ProviderRow | null> {
  if (useSupabase) {
    const res = await fetch(`${PROVIDERS}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToProvider(rows[0]) : null;
  }
  return authFileLoad().providers.find((p) => p.id === id && p.userId === userId) ?? null;
}

export async function addProvider(input: {
  userId: string; providerType: string; name: string; encryptedKey: string; keyIv: string; keyTag: string; baseUrl?: string;
}): Promise<ProviderRow> {
  const now = new Date().toISOString();
  if (useSupabase) {
    const res = await fetch(PROVIDERS, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'return=representation' }),
      body: JSON.stringify({
        user_id: input.userId, provider_type: input.providerType, name: input.name,
        encrypted_key: input.encryptedKey, key_iv: input.keyIv, key_tag: input.keyTag,
        base_url: input.baseUrl ?? null, status: 'connected',
      }),
    });
    if (!res.ok) throw new Error(`Falha ao salvar provider: HTTP ${res.status}`);
    const rows = (await res.json()) as any[];
    return rowToProvider(rows[0]);
  }
  const d = authFileLoad();
  const row: ProviderRow = {
    id: crypto.randomUUID(), userId: input.userId, providerType: input.providerType, name: input.name,
    encryptedKey: input.encryptedKey, keyIv: input.keyIv, keyTag: input.keyTag, baseUrl: input.baseUrl,
    status: 'connected', models: [], createdAt: now, updatedAt: now,
  };
  d.providers.push(row);
  authFileSave(d);
  return row;
}

export async function updateProviderTestResult(id: string, fields: { status: 'connected' | 'error'; lastTestedError?: string | null; models?: unknown[] }): Promise<void> {
  const now = new Date().toISOString();
  if (useSupabase) {
    await fetch(`${PROVIDERS}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({ status: fields.status, last_tested_at: now, last_tested_error: fields.lastTestedError ?? null, ...(fields.models ? { models: fields.models } : {}), updated_at: now }),
    });
    return;
  }
  const d = authFileLoad();
  const p = d.providers.find((x) => x.id === id);
  if (p) { p.status = fields.status; p.lastTestedAt = now; p.lastTestedError = fields.lastTestedError ?? undefined; if (fields.models) p.models = fields.models; p.updatedAt = now; authFileSave(d); }
}

export async function removeProvider(id: string, userId: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${PROVIDERS}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = authFileLoad();
  const before = d.providers.length;
  d.providers = d.providers.filter((p) => !(p.id === id && p.userId === userId));
  authFileSave(d);
  return d.providers.length < before;
}
