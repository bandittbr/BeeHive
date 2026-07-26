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
  origin?: string; // 'autoclip' quando gerado pelo piloto automático de cortes
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
    origin: r.origin ?? undefined,
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
      body: JSON.stringify({ id: post.id, platform: post.platform, file: post.file, title: post.title, description: post.description, tags: post.tags, at: post.at, status: post.status, created_at: post.createdAt, account_id: post.accountId ?? null, origin: post.origin ?? null }) });
    return post;
  }
  const d = fileLoad(); d.posts.push(post); fileSave(d); return post;
}

// Conta quantos posts de uma origem (ex.: 'autoclip') já foram criados no dia
// de hoje (pending/publishing/done) — usado pra respeitar o limite de posts/dia.
export async function countPostsTodayByOrigin(origin: string): Promise<number> {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const from = startOfDay.getTime();
  if (useSupabase) {
    const res = await fetch(`${POSTS}?origin=eq.${encodeURIComponent(origin)}&created_at=gte.${from}&select=id&status=neq.error`, { headers: sbHeaders({ prefer: 'count=exact' }) });
    if (!res.ok) return 0;
    const rows = (await res.json().catch(() => [])) as any[];
    return Array.isArray(rows) ? rows.length : 0;
  }
  return fileLoad().posts.filter((p) => p.origin === origin && p.createdAt >= from && p.status !== 'error').length;
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

// ---------- Conversas + mensagens (persistência real do chat) ----------
export interface ConversationRow {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  model?: string;
  reasoningEffort?: string;
  createdAt: string;
  updatedAt: string;
}
export interface MessageRow {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  content: string;
  model?: string;
  reasoningEffort?: string;
  createdAt: string;
}

const CONVERSATIONS = `${SUPABASE_URL}/rest/v1/beehive_conversations`;
const MESSAGES = `${SUPABASE_URL}/rest/v1/beehive_messages`;

function rowToConversation(r: any): ConversationRow {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    projectId: r.project_id ?? undefined,
    title: r.title,
    model: r.model ?? undefined,
    reasoningEffort: r.reasoning_effort ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function rowToMessage(r: any): MessageRow {
  return {
    id: String(r.id),
    conversationId: String(r.conversation_id),
    userId: String(r.user_id),
    role: r.role,
    content: r.content,
    model: r.model ?? undefined,
    reasoningEffort: r.reasoning_effort ?? undefined,
    createdAt: r.created_at,
  };
}

// arquivo (fallback, uso local/dev sem Supabase)
interface ChatFileData { conversations: ConversationRow[]; messages: MessageRow[] }
const CHAT_FILE = path.join(WORKSPACE_ROOT, '.beehive-chat.json');
function chatFileLoad(): ChatFileData {
  try {
    const d = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8')) as ChatFileData;
    if (!Array.isArray(d.conversations)) d.conversations = [];
    if (!Array.isArray(d.messages)) d.messages = [];
    return d;
  } catch { return { conversations: [], messages: [] }; }
}
function chatFileSave(d: ChatFileData): void {
  try { fs.mkdirSync(WORKSPACE_ROOT, { recursive: true }); fs.writeFileSync(CHAT_FILE, JSON.stringify(d, null, 2), 'utf8'); } catch { /* ignore */ }
}

export async function listConversations(userId: string, projectId?: string): Promise<ConversationRow[]> {
  if (useSupabase) {
    const q = projectId
      ? `?user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&select=*&order=updated_at.desc`
      : `?user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`;
    const res = await fetch(`${CONVERSATIONS}${q}`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToConversation);
  }
  const all = chatFileLoad().conversations.filter((c) => c.userId === userId && (!projectId || c.projectId === projectId));
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(id: string, userId: string): Promise<ConversationRow | null> {
  if (useSupabase) {
    const res = await fetch(`${CONVERSATIONS}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToConversation(rows[0]) : null;
  }
  return chatFileLoad().conversations.find((c) => c.id === id && c.userId === userId) ?? null;
}

export async function createConversation(input: { userId: string; projectId?: string; title: string; model?: string; reasoningEffort?: string }): Promise<ConversationRow> {
  if (useSupabase) {
    const res = await fetch(CONVERSATIONS, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'return=representation' }),
      body: JSON.stringify({ user_id: input.userId, project_id: input.projectId ?? null, title: input.title, model: input.model ?? null, reasoning_effort: input.reasoningEffort ?? 'default' }),
    });
    if (!res.ok) throw new Error(`Falha ao criar conversa: HTTP ${res.status}`);
    const rows = (await res.json()) as any[];
    return rowToConversation(rows[0]);
  }
  const now = new Date().toISOString();
  const row: ConversationRow = { id: crypto.randomUUID(), userId: input.userId, projectId: input.projectId, title: input.title, model: input.model, reasoningEffort: input.reasoningEffort ?? 'default', createdAt: now, updatedAt: now };
  const d = chatFileLoad(); d.conversations.push(row); chatFileSave(d);
  return row;
}

export async function updateConversation(id: string, userId: string, fields: Partial<Pick<ConversationRow, 'title' | 'model' | 'reasoningEffort'>>): Promise<ConversationRow | null> {
  const now = new Date().toISOString();
  if (useSupabase) {
    const body: Record<string, unknown> = { updated_at: now };
    if (fields.title !== undefined) body.title = fields.title;
    if (fields.model !== undefined) body.model = fields.model;
    if (fields.reasoningEffort !== undefined) body.reasoning_effort = fields.reasoningEffort;
    const res = await fetch(`${CONVERSATIONS}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'PATCH', headers: sbHeaders({ prefer: 'return=representation' }), body: JSON.stringify(body) });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToConversation(rows[0]) : null;
  }
  const d = chatFileLoad();
  const c = d.conversations.find((x) => x.id === id && x.userId === userId);
  if (!c) return null;
  Object.assign(c, fields, { updatedAt: now });
  chatFileSave(d);
  return c;
}

export async function touchConversation(id: string): Promise<void> {
  if (useSupabase) {
    await fetch(`${CONVERSATIONS}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: sbHeaders({ prefer: 'return=minimal' }), body: JSON.stringify({ updated_at: new Date().toISOString() }) });
    return;
  }
  const d = chatFileLoad();
  const c = d.conversations.find((x) => x.id === id);
  if (c) { c.updatedAt = new Date().toISOString(); chatFileSave(d); }
}

export async function deleteConversation(id: string, userId: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${CONVERSATIONS}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = chatFileLoad();
  const before = d.conversations.length;
  d.conversations = d.conversations.filter((c) => !(c.id === id && c.userId === userId));
  d.messages = d.messages.filter((m) => m.conversationId !== id);
  chatFileSave(d);
  return d.conversations.length < before;
}

export async function listMessages(conversationId: string, userId: string): Promise<MessageRow[]> {
  if (useSupabase) {
    const res = await fetch(`${MESSAGES}?conversation_id=eq.${encodeURIComponent(conversationId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.asc`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToMessage);
  }
  return chatFileLoad().messages.filter((m) => m.conversationId === conversationId && m.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addMessage(input: { conversationId: string; userId: string; role: string; content: string; model?: string; reasoningEffort?: string }): Promise<MessageRow> {
  if (useSupabase) {
    const res = await fetch(MESSAGES, {
      method: 'POST',
      headers: sbHeaders({ prefer: 'return=representation' }),
      body: JSON.stringify({ conversation_id: input.conversationId, user_id: input.userId, role: input.role, content: input.content, model: input.model ?? null, reasoning_effort: input.reasoningEffort ?? null }),
    });
    if (!res.ok) throw new Error(`Falha ao salvar mensagem: HTTP ${res.status}`);
    const rows = (await res.json()) as any[];
    await touchConversation(input.conversationId);
    return rowToMessage(rows[0]);
  }
  const now = new Date().toISOString();
  const row: MessageRow = { id: crypto.randomUUID(), conversationId: input.conversationId, userId: input.userId, role: input.role, content: input.content, model: input.model, reasoningEffort: input.reasoningEffort, createdAt: now };
  const d = chatFileLoad(); d.messages.push(row); chatFileSave(d);
  await touchConversation(input.conversationId);
  return row;
}

// ---------- Piloto automático de cortes (canais fonte + config + histórico) ----------
// Piloto = uma automação independente (ex.: "Humor", "Terror", "Tech"), cada
// uma com seus próprios canais fonte e contas-alvo (de beehive_accounts).
export interface ClipPilot {
  id: string;
  name: string;
  niche?: string;
  description?: string;
  active: boolean;
  postsPerDay: number;
  times?: string; // "12:00,18:00,21:00" — se vazio, espalha automático
  accountIds: string[]; // ids de beehive_accounts (qualquer rede, misturado)
  discoveryMode: boolean; // true = busca automática por nicho, sem canal fixo
  minDurationMin: number; // duração mínima do vídeo fonte (minutos), usado na busca automática
  createdAt: number;
  updatedAt: number;
}
export interface ClipChannel {
  id: string;
  pilotId: string;
  channelUrl: string;
  label?: string;
  active: boolean;
  createdAt: number;
}
export interface ClipHistoryEntry {
  videoId: string;
  pilotId?: string;
  channelUrl?: string;
  title?: string;
  status: 'done' | 'error' | 'skipped';
  clipsGenerated: number;
  error?: string;
  processedAt: number;
}

const CLIP_PILOTS = `${SUPABASE_URL}/rest/v1/beehive_clip_pilots`;
const CLIP_CHANNELS = `${SUPABASE_URL}/rest/v1/beehive_clip_channels`;
const CLIP_HISTORY = `${SUPABASE_URL}/rest/v1/beehive_clip_history`;

function rowToPilot(r: any): ClipPilot {
  return {
    id: String(r.id), name: r.name, niche: r.niche ?? undefined, description: r.description ?? undefined,
    active: !!r.active, postsPerDay: Number(r.posts_per_day) || 1, times: r.times ?? undefined,
    accountIds: Array.isArray(r.account_ids) ? r.account_ids : [],
    discoveryMode: !!r.discovery_mode, minDurationMin: Number(r.min_duration_min) || 60,
    createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
  };
}
function rowToChannel(r: any): ClipChannel {
  return { id: String(r.id), pilotId: String(r.pilot_id), channelUrl: r.channel_url, label: r.label ?? undefined, active: !!r.active, createdAt: Number(r.created_at) };
}
function rowToHistory(r: any): ClipHistoryEntry {
  return { videoId: String(r.video_id), pilotId: r.pilot_id ?? undefined, channelUrl: r.channel_url ?? undefined, title: r.title ?? undefined, status: r.status, clipsGenerated: Number(r.clips_generated) || 0, error: r.error ?? undefined, processedAt: Number(r.processed_at) };
}

interface AutoclipFileData { pilots: ClipPilot[]; channels: ClipChannel[]; history: ClipHistoryEntry[] }
const AUTOCLIP_FILE = path.join(WORKSPACE_ROOT, '.beehive-autoclip.json');
function autoclipFileLoad(): AutoclipFileData {
  try {
    const d = JSON.parse(fs.readFileSync(AUTOCLIP_FILE, 'utf8')) as AutoclipFileData;
    if (!Array.isArray(d.pilots)) d.pilots = [];
    if (!Array.isArray(d.channels)) d.channels = [];
    if (!Array.isArray(d.history)) d.history = [];
    return d;
  } catch { return { pilots: [], channels: [], history: [] }; }
}
function autoclipFileSave(d: AutoclipFileData): void {
  try { fs.mkdirSync(WORKSPACE_ROOT, { recursive: true }); fs.writeFileSync(AUTOCLIP_FILE, JSON.stringify(d, null, 2), 'utf8'); } catch { /* ignore */ }
}

export async function listPilots(): Promise<ClipPilot[]> {
  if (useSupabase) {
    const res = await fetch(`${CLIP_PILOTS}?select=*&order=created_at.asc`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToPilot);
  }
  return autoclipFileLoad().pilots;
}

export async function getPilot(id: string): Promise<ClipPilot | null> {
  if (useSupabase) {
    const res = await fetch(`${CLIP_PILOTS}?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToPilot(rows[0]) : null;
  }
  return autoclipFileLoad().pilots.find((p) => p.id === id) ?? null;
}

export async function createPilot(input: { name: string; niche?: string; description?: string; postsPerDay?: number; times?: string; accountIds?: string[]; discoveryMode?: boolean; minDurationMin?: number }): Promise<ClipPilot> {
  const now = Date.now();
  const row: ClipPilot = {
    id: `${now}_${Math.random().toString(36).slice(2, 8)}`, name: input.name, niche: input.niche, description: input.description,
    active: false, postsPerDay: Math.max(1, input.postsPerDay || 1), times: input.times, accountIds: input.accountIds ?? [],
    discoveryMode: !!input.discoveryMode, minDurationMin: Math.max(1, input.minDurationMin || 60),
    createdAt: now, updatedAt: now,
  };
  if (useSupabase) {
    const res = await fetch(CLIP_PILOTS, { method: 'POST', headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({ id: row.id, name: row.name, niche: row.niche ?? null, description: row.description ?? null, active: row.active, posts_per_day: row.postsPerDay, times: row.times ?? null, account_ids: row.accountIds, discovery_mode: row.discoveryMode, min_duration_min: row.minDurationMin, created_at: row.createdAt, updated_at: row.updatedAt }) });
    if (!res.ok) throw new Error(`falha ao salvar piloto no banco (HTTP ${res.status}): ${await res.text().catch(() => '')}`);
    return row;
  }
  const d = autoclipFileLoad(); d.pilots.push(row); autoclipFileSave(d); return row;
}

export async function updatePilot(id: string, fields: Partial<Pick<ClipPilot, 'name' | 'niche' | 'description' | 'active' | 'postsPerDay' | 'times' | 'accountIds' | 'discoveryMode' | 'minDurationMin'>>): Promise<ClipPilot | null> {
  const now = Date.now();
  if (useSupabase) {
    const body: Record<string, unknown> = { updated_at: now };
    if (fields.name !== undefined) body.name = fields.name;
    if (fields.niche !== undefined) body.niche = fields.niche;
    if (fields.description !== undefined) body.description = fields.description;
    if (fields.active !== undefined) body.active = fields.active;
    if (fields.postsPerDay !== undefined) body.posts_per_day = fields.postsPerDay;
    if (fields.times !== undefined) body.times = fields.times;
    if (fields.accountIds !== undefined) body.account_ids = fields.accountIds;
    if (fields.discoveryMode !== undefined) body.discovery_mode = fields.discoveryMode;
    if (fields.minDurationMin !== undefined) body.min_duration_min = fields.minDurationMin;
    const res = await fetch(`${CLIP_PILOTS}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: sbHeaders({ prefer: 'return=representation' }), body: JSON.stringify(body) });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToPilot(rows[0]) : null;
  }
  const d = autoclipFileLoad();
  const p = d.pilots.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, fields, { updatedAt: now });
  autoclipFileSave(d);
  return p;
}

export async function deletePilot(id: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${CLIP_PILOTS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = autoclipFileLoad();
  const before = d.pilots.length;
  d.pilots = d.pilots.filter((p) => p.id !== id);
  d.channels = d.channels.filter((c) => c.pilotId !== id);
  autoclipFileSave(d);
  return d.pilots.length < before;
}

export async function listClipChannels(pilotId: string): Promise<ClipChannel[]> {
  if (useSupabase) {
    const res = await fetch(`${CLIP_CHANNELS}?pilot_id=eq.${encodeURIComponent(pilotId)}&select=*&order=created_at.asc`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToChannel);
  }
  return autoclipFileLoad().channels.filter((c) => c.pilotId === pilotId);
}

export async function addClipChannel(input: { pilotId: string; channelUrl: string; label?: string }): Promise<ClipChannel> {
  const row: ClipChannel = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, pilotId: input.pilotId, channelUrl: input.channelUrl, label: input.label, active: true, createdAt: Date.now() };
  if (useSupabase) {
    await fetch(CLIP_CHANNELS, { method: 'POST', headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({ id: row.id, pilot_id: row.pilotId, channel_url: row.channelUrl, label: row.label ?? null, active: true, created_at: row.createdAt }) });
    return row;
  }
  const d = autoclipFileLoad(); d.channels.push(row); autoclipFileSave(d); return row;
}

export async function removeClipChannel(id: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${CLIP_CHANNELS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = autoclipFileLoad();
  const before = d.channels.length;
  d.channels = d.channels.filter((c) => c.id !== id);
  autoclipFileSave(d);
  return d.channels.length < before;
}

export async function isVideoProcessed(videoId: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${CLIP_HISTORY}?video_id=eq.${encodeURIComponent(videoId)}&select=video_id`, { headers: sbHeaders() });
    if (!res.ok) return false;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.length > 0;
  }
  return autoclipFileLoad().history.some((h) => h.videoId === videoId);
}

export async function addClipHistory(entry: ClipHistoryEntry): Promise<void> {
  if (useSupabase) {
    await fetch(CLIP_HISTORY, { method: 'POST', headers: sbHeaders({ prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ video_id: entry.videoId, pilot_id: entry.pilotId ?? null, channel_url: entry.channelUrl ?? null, title: entry.title ?? null, status: entry.status, clips_generated: entry.clipsGenerated, error: entry.error ?? null, processed_at: entry.processedAt }) });
    return;
  }
  const d = autoclipFileLoad(); d.history.push(entry); autoclipFileSave(d);
}

// ---------- Leads (Google Maps Scraper + Prospecção) ----------
export type LeadStatus = 'new' | 'analyzing' | 'segment_identified' | 'sample_generated' | 'proposal_sent' | 'responded' | 'converted' | 'closed';

export interface Lead {
  id: string;
  name: string;
  address?: string;
  website?: string;
  phone?: string;
  category?: string;
  placeType?: string;
  email?: string;
  reviewsCount?: number;
  reviewsAverage?: number;
  status: LeadStatus;
  notes?: string;
  segment?: string;
  sampleGenerated: boolean;
  sampleUrl?: string;
  proposalSent: boolean;
  proposalSentAt?: number;
  proposalMessage?: string;
  responseReceived: boolean;
  responseAt?: number;
  responseType?: 'interested' | 'not_interested' | 'no_answer' | '';
  whatsappSent: boolean;
  whatsappSentAt?: number;
  createdAt: number;
  updatedAt: number;
  scrapedAt?: number;
  scrapeQuery?: string;
  introduction?: string;
  opensAt?: string;
}

const LEADS = `${SUPABASE_URL}/rest/v1/beehive_leads`;

function rowToLead(r: any): Lead {
  return {
    id: String(r.id),
    name: r.name,
    address: r.address ?? undefined,
    website: r.website ?? undefined,
    phone: r.phone ?? undefined,
    category: r.category ?? undefined,
    placeType: r.place_type ?? undefined,
    email: r.email ?? undefined,
    reviewsCount: r.reviews_count ?? undefined,
    reviewsAverage: r.reviews_average ?? undefined,
    status: r.status ?? 'new',
    notes: r.notes ?? undefined,
    segment: r.segment ?? undefined,
    sampleGenerated: !!r.sample_generated,
    sampleUrl: r.sample_url ?? undefined,
    proposalSent: !!r.proposal_sent,
    proposalSentAt: r.proposal_sent_at ?? undefined,
    proposalMessage: r.proposal_message ?? undefined,
    responseReceived: !!r.response_received,
    responseAt: r.response_at ?? undefined,
    responseType: r.response_type ?? '',
    whatsappSent: r.whatsapp_sent ?? false,
    whatsappSentAt: r.whatsapp_sent_at ?? undefined,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    scrapedAt: r.scraped_at ?? undefined,
    scrapeQuery: r.scrape_query ?? undefined,
    introduction: r.introduction ?? undefined,
    opensAt: r.opens_at ?? undefined,
  };
}

interface LeadsFileData { leads: Lead[] }
const LEADS_FILE = path.join(WORKSPACE_ROOT, '.beehive-leads.json');
function leadsFileLoad(): LeadsFileData {
  try {
    const d = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')) as LeadsFileData;
    if (!Array.isArray(d.leads)) d.leads = [];
    return d;
  } catch { return { leads: [] }; }
}
function leadsFileSave(d: LeadsFileData): void {
  try { fs.mkdirSync(WORKSPACE_ROOT, { recursive: true }); fs.writeFileSync(LEADS_FILE, JSON.stringify(d, null, 2), 'utf8'); } catch { /* ignore */ }
}

export async function listLeads(status?: LeadStatus, category?: string, search?: string): Promise<Lead[]> {
  if (useSupabase) {
    let q = '?select=*&order=created_at.desc';
    if (status) q += `&status=eq.${encodeURIComponent(status)}`;
    if (category) q += `&category=eq.${encodeURIComponent(category)}`;
    if (search) q += `&name=like.*${encodeURIComponent(search)}*`;
    const res = await fetch(`${LEADS}${q}`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToLead);
  }
  let leads = leadsFileLoad().leads;
  if (status) leads = leads.filter((l) => l.status === status);
  if (category) leads = leads.filter((l) => l.category === category);
  if (search) leads = leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
  return leads.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLead(id: string): Promise<Lead | null> {
  if (useSupabase) {
    const res = await fetch(`${LEADS}?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToLead(rows[0]) : null;
  }
  return leadsFileLoad().leads.find((l) => l.id === id) ?? null;
}

export async function addLead(input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'sampleGenerated' | 'proposalSent' | 'responseReceived' | 'whatsappSent'> & { status?: LeadStatus }): Promise<Lead> {
  const now = Date.now();
  const lead: Lead = {
    id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    address: input.address,
    website: input.website,
    phone: input.phone,
    category: input.category,
    placeType: input.placeType,
    email: input.email,
    reviewsCount: input.reviewsCount,
    reviewsAverage: input.reviewsAverage,
    status: input.status ?? 'new',
    notes: input.notes,
    sampleGenerated: false,
    proposalSent: false,
    responseReceived: false,
    responseType: '',
    whatsappSent: false,
    createdAt: now,
    updatedAt: now,
    scrapedAt: input.scrapedAt ?? now,
    scrapeQuery: input.scrapeQuery,
    introduction: input.introduction,
    opensAt: input.opensAt,
  };

  if (useSupabase) {
    await fetch(LEADS, { method: 'POST', headers: sbHeaders({ prefer: 'return=minimal' }),
      body: JSON.stringify({
        id: lead.id, name: lead.name, address: lead.address ?? null, website: lead.website ?? null,
        phone: lead.phone ?? null, category: lead.category ?? null, place_type: lead.placeType ?? null,
        email: lead.email ?? null, reviews_count: lead.reviewsCount ?? null, reviews_average: lead.reviewsAverage ?? null,
        status: lead.status, notes: lead.notes ?? null, sample_generated: false, proposal_sent: false, response_received: false, whatsapp_sent: false,
        created_at: lead.createdAt, updated_at: lead.updatedAt, scraped_at: lead.scrapedAt ?? null,
        scrape_query: lead.scrapeQuery ?? null, introduction: lead.introduction ?? null, opens_at: lead.opensAt ?? null,
      }) });
    return lead;
  }
  const d = leadsFileLoad(); d.leads.push(lead); leadsFileSave(d); return lead;
}

export async function addLeadsBatch(leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'sampleGenerated' | 'proposalSent' | 'responseReceived' | 'whatsappSent'>>): Promise<number> {
  const now = Date.now();
  const newLeads: Lead[] = leads.map((l) => ({
    id: `${now}_${Math.random().toString(36).slice(2, 8)}_${Math.random().toString(36).slice(2, 6)}`,
    name: l.name,
    address: l.address, website: l.website, phone: l.phone, category: l.category,
    placeType: l.placeType, email: l.email, reviewsCount: l.reviewsCount, reviewsAverage: l.reviewsAverage,
    status: 'new' as LeadStatus, sampleGenerated: false, proposalSent: false, responseReceived: false, responseType: '',
    whatsappSent: false,
    createdAt: now, updatedAt: now, scrapedAt: l.scrapedAt ?? now, scrapeQuery: l.scrapeQuery,
    introduction: l.introduction, opensAt: l.opensAt,
  }));

  if (useSupabase) {
    for (const lead of newLeads) {
      await fetch(LEADS, { method: 'POST', headers: sbHeaders({ prefer: 'return=minimal' }),
        body: JSON.stringify({
          id: lead.id, name: lead.name, address: lead.address ?? null, website: lead.website ?? null,
          phone: lead.phone ?? null, category: lead.category ?? null, place_type: lead.placeType ?? null,
          email: lead.email ?? null, reviews_count: lead.reviewsCount ?? null, reviews_average: lead.reviewsAverage ?? null,
          status: lead.status, created_at: lead.createdAt, updated_at: lead.updatedAt,
          scraped_at: lead.scrapedAt ?? null, scrape_query: lead.scrapeQuery ?? null,
          introduction: lead.introduction ?? null, opens_at: lead.opensAt ?? null,
        }) });
    }
    return newLeads.length;
  }
  const d = leadsFileLoad(); d.leads.push(...newLeads); leadsFileSave(d);
  return newLeads.length;
}

export async function updateLead(id: string, fields: Partial<Pick<Lead, 'status' | 'notes' | 'segment' | 'sampleGenerated' | 'sampleUrl' | 'proposalSent' | 'proposalSentAt' | 'proposalMessage' | 'responseReceived' | 'responseAt' | 'responseType' | 'email' | 'whatsappSent' | 'whatsappSentAt'>>): Promise<Lead | null> {
  const now = Date.now();
  if (useSupabase) {
    const body: Record<string, unknown> = { updated_at: now };
    if (fields.status !== undefined) body.status = fields.status;
    if (fields.notes !== undefined) body.notes = fields.notes;
    if (fields.segment !== undefined) body.segment = fields.segment;
    if (fields.sampleGenerated !== undefined) body.sample_generated = fields.sampleGenerated;
    if (fields.sampleUrl !== undefined) body.sample_url = fields.sampleUrl;
    if (fields.proposalSent !== undefined) body.proposal_sent = fields.proposalSent;
    if (fields.proposalSentAt !== undefined) body.proposal_sent_at = fields.proposalSentAt;
    if (fields.proposalMessage !== undefined) body.proposal_message = fields.proposalMessage;
    if (fields.responseReceived !== undefined) body.response_received = fields.responseReceived;
    if (fields.responseAt !== undefined) body.response_at = fields.responseAt;
    if (fields.responseType !== undefined) body.response_type = fields.responseType;
    if (fields.email !== undefined) body.email = fields.email;
    if (fields.whatsappSent !== undefined) body.whatsapp_sent = fields.whatsappSent;
    if (fields.whatsappSentAt !== undefined) body.whatsapp_sent_at = fields.whatsappSentAt;
    const res = await fetch(`${LEADS}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: sbHeaders({ prefer: 'return=representation' }), body: JSON.stringify(body) });
    if (!res.ok) return null;
    const rows = (await res.json().catch(() => [])) as any[];
    return rows[0] ? rowToLead(rows[0]) : null;
  }
  const d = leadsFileLoad();
  const l = d.leads.find((x) => x.id === id);
  if (!l) return null;
  Object.assign(l, fields, { updatedAt: now });
  leadsFileSave(d);
  return l;
}

export async function deleteLead(id: string): Promise<boolean> {
  if (useSupabase) {
    const res = await fetch(`${LEADS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: sbHeaders({ prefer: 'return=minimal' }) });
    return res.ok;
  }
  const d = leadsFileLoad();
  const before = d.leads.length;
  d.leads = d.leads.filter((l) => l.id !== id);
  leadsFileSave(d);
  return d.leads.length < before;
}

export async function getLeadsDashboard(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  newToday: number;
  proposalSent: number;
  responded: number;
  converted: number;
}> {
  const leads = await listLeads();
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const from = startOfDay.getTime();

  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    const cat = l.category || 'Outros';
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  return {
    total: leads.length,
    byStatus,
    byCategory,
    newToday: leads.filter((l) => l.createdAt >= from).length,
    proposalSent: leads.filter((l) => l.proposalSent).length,
    responded: leads.filter((l) => l.responseReceived).length,
    converted: leads.filter((l) => l.status === 'converted').length,
  };
}

// ---------- Automação de Leads (config + histórico) ----------

export interface LeadsAutomationConfig {
  enabled: boolean;
  /** Intervalo mínimo entre processamentos (ms). Default: 5 min */
  intervalMs: number;
  /** Processar leads automaticamente? */
  autoProcess: boolean;
  /** Marcar como 'no_answer' após X dias sem resposta */
  autoCloseDays: number;
  /** Enviar WhatsApp automaticamente? (requer integração WABA) */
  autoSendWhatsApp: boolean;
  updatedAt: number;
}

export interface LeadsAutomationLog {
  id: string;
  runAt: number;
  /** Quantos leads processados nesta execução */
  processedCount: number;
  /** Quantos avançaram de etapa */
  advancedCount: number;
  /** Quantos erros */
  errorCount: number;
  /** Detalhes (opcional) */
  details?: string;
  status: 'running' | 'done' | 'error';
  finishedAt?: number;
}

const AUTO_CONFIG_FILE = path.join(WORKSPACE_ROOT, '.beehive-leads-automation.json');
const AUTO_LOG_FILE = path.join(WORKSPACE_ROOT, '.beehive-leads-automation-logs.json');

function autoConfigLoad(): LeadsAutomationConfig {
  try {
    return JSON.parse(fs.readFileSync(AUTO_CONFIG_FILE, 'utf8'));
  } catch {
    return { enabled: true, intervalMs: 5 * 60 * 1000, autoProcess: true, autoCloseDays: 7, autoSendWhatsApp: false, updatedAt: Date.now() };
  }
}
function autoConfigSave(c: LeadsAutomationConfig): void {
  try { fs.writeFileSync(AUTO_CONFIG_FILE, JSON.stringify(c, null, 2), 'utf8'); } catch { /* ignore */ }
}

function autoLogLoad(): LeadsAutomationLog[] {
  try {
    const d = JSON.parse(fs.readFileSync(AUTO_LOG_FILE, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
function autoLogSave(logs: LeadsAutomationLog[]): void {
  try { fs.writeFileSync(AUTO_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8'); } catch { /* ignore */ }
}

export async function getLeadsAutomationConfig(): Promise<LeadsAutomationConfig> {
  return autoConfigLoad();
}

export async function updateLeadsAutomationConfig(fields: Partial<LeadsAutomationConfig>): Promise<LeadsAutomationConfig> {
  const cfg = autoConfigLoad();
  Object.assign(cfg, fields, { updatedAt: Date.now() });
  autoConfigSave(cfg);
  return cfg;
}

export async function addLeadsAutomationLog(entry: Omit<LeadsAutomationLog, 'id'>): Promise<LeadsAutomationLog> {
  const log: LeadsAutomationLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
  };
  const logs = autoLogLoad();
  logs.unshift(log);
  if (logs.length > 200) logs.length = 200; // keep last 200
  autoLogSave(logs);
  return log;
}

export async function updateLeadsAutomationLog(id: string, fields: Partial<Pick<LeadsAutomationLog, 'status' | 'finishedAt' | 'processedCount' | 'advancedCount' | 'errorCount' | 'details'>>): Promise<void> {
  const logs = autoLogLoad();
  const entry = logs.find((l) => l.id === id);
  if (entry) {
    Object.assign(entry, fields);
    autoLogSave(logs);
  }
}

export async function listLeadsAutomationLogs(limit = 20): Promise<LeadsAutomationLog[]> {
  return autoLogLoad().slice(0, limit);
}

// ---------- fim Leads ----------

export async function listClipHistory(pilotId?: string, limit = 30): Promise<ClipHistoryEntry[]> {
  if (useSupabase) {
    const q = pilotId ? `&pilot_id=eq.${encodeURIComponent(pilotId)}` : '';
    const res = await fetch(`${CLIP_HISTORY}?select=*&order=processed_at.desc&limit=${limit}${q}`, { headers: sbHeaders() });
    if (!res.ok) return [];
    const rows = (await res.json().catch(() => [])) as any[];
    return rows.map(rowToHistory);
  }
  return autoclipFileLoad().history.filter((h) => !pilotId || h.pilotId === pilotId).slice().sort((a, b) => b.processedAt - a.processedAt).slice(0, limit);
}
