// BeeHive Cowork Nuvem — servidor do worker.
// Jobs (shell/files/git/browser/cortes/publish) + AGENDADOR + OAuth multi-conta.
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { ensureWorkspace, WORKSPACE_ROOT, resolveInWorkspace } from './workspace.js';
import { runShell } from './executors/shell.js';
import { writeFile, readFile } from './executors/files.js';
import { runGit } from './executors/git.js';
import { runBrowser } from './executors/browser.js';
import { runYtFetch, runClip } from './executors/media.js';
import { runPublishYoutube } from './executors/publish.js';
import { runPublishInstagram, runPublishFacebook } from './executors/publishMeta.js';
import { runPublishTiktok, refreshTiktok, publishTiktokWithToken } from './executors/publishTiktok.js';
import { buildAuthUrl, exchangeCode } from './oauth.js';
import {
  getYoutubeCreds, setYoutubeCreds, hasYoutubeCreds,
  getPlatformCreds, setPlatformCreds, hasPlatformCreds,
  getOauthApp, setOauthApp, hasOauthApp,
  listAccounts, getAccount, upsertAccount, updateAccountTokens, removeAccount,
  listPosts, getDuePosts, addPost, updatePost, removePost, storageMode,
  type ScheduledPost, type PlatformId,
} from './store.js';
import type { JobEvent, JobRecord, JobRequest } from './types.js';
import { bootKernel, executeCapability, listCapabilities } from './kernel-bridge.js';

const PORT = Number(process.env.PORT ?? 4000);
const AUTH_TOKEN = process.env.WORKER_TOKEN ?? '';
const PUBLIC_URL = (process.env.WORKER_PUBLIC_URL ?? '').replace(/\/+$/, '');
const PLATFORMS: PlatformId[] = ['youtube', 'instagram', 'facebook', 'tiktok'];

ensureWorkspace();

// Boot kernel com plugins (assíncrono, não bloqueia o listen)
bootKernel().catch((err) => console.error('[kernel] boot failed:', err));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const jobs = new Map<string, JobRecord>();
const listeners = new Map<string, Set<(e: JobEvent) => void>>();
const pendingStates = new Set<string>();

function emit(jobId: string, e: Omit<JobEvent, 'jobId' | 'ts'>) {
  const evt: JobEvent = { jobId, ts: Date.now(), ...e };
  const rec = jobs.get(jobId);
  if (rec && (e.kind === 'stdout' || e.kind === 'stderr')) rec.output += e.data ?? '';
  listeners.get(jobId)?.forEach((fn) => fn(evt));
}

function authOk(req: express.Request): boolean {
  if (!AUTH_TOKEN) return true;
  return (req.header('authorization') ?? '') === `Bearer ${AUTH_TOKEN}`;
}

function page(title: string, msg: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
    `<body style="font-family:system-ui,sans-serif;padding:48px;text-align:center;background:#0b0b0f;color:#eee">` +
    `<h2>${title}</h2><p style="color:#aaa">${msg}</p>` +
    `<script>try{window.opener&&window.opener.postMessage({beehiveOauth:true},'*')}catch(e){}setTimeout(function(){window.close()},1500)</script></body>`;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'beehive-worker', workspace: WORKSPACE_ROOT, jobs: jobs.size, storage: storageMode() });
});

app.get('/files/:name(*)', (req, res) => {
  const q = typeof req.query.t === 'string' ? req.query.t : '';
  const ok = !AUTH_TOKEN || req.header('authorization') === `Bearer ${AUTH_TOKEN}` || q === AUTH_TOKEN;
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  try {
    const abs = resolveInWorkspace((req.params as Record<string, string>).name);
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'not found' });
    res.sendFile(abs);
  } catch { res.status(400).json({ error: 'bad path' }); }
});

// --- credenciais YouTube ---
app.post('/creds/youtube', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body as { clientId?: string; clientSecret?: string; refreshToken?: string; privacyStatus?: string };
  if (!b?.clientId || !b?.clientSecret || !b?.refreshToken) return res.status(400).json({ error: 'clientId, clientSecret e refreshToken são obrigatórios' });
  const privacyStatus = ['public', 'unlisted', 'private'].includes(String(b.privacyStatus)) ? (b.privacyStatus as 'public' | 'unlisted' | 'private') : 'public';
  await setYoutubeCreds({ clientId: b.clientId, clientSecret: b.clientSecret, refreshToken: b.refreshToken, privacyStatus });
  res.json({ ok: true });
});
app.get('/creds/youtube', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasYoutubeCreds() });
});

// --- config do app OAuth por rede (client_id/secret) ---
app.post('/oauth/apps/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = (req.params as Record<string, string>).platform;
  const b = req.body as { clientId?: string; clientSecret?: string; scopes?: string };
  if (!b?.clientId || !b?.clientSecret) return res.status(400).json({ error: 'clientId e clientSecret são obrigatórios' });
  await setOauthApp(platform, { clientId: b.clientId, clientSecret: b.clientSecret, scopes: b.scopes });
  res.json({ ok: true });
});
app.get('/oauth/apps/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasOauthApp((req.params as Record<string, string>).platform) });
});

// --- início do fluxo OAuth (redireciona para a rede) ---
app.get('/oauth/:platform/start', async (req, res) => {
  const q = typeof req.query.t === 'string' ? req.query.t : '';
  if (AUTH_TOKEN && q !== AUTH_TOKEN) return res.status(401).send('unauthorized');
  const platform = (req.params as Record<string, string>).platform;
  if (!PUBLIC_URL) return res.status(500).send('WORKER_PUBLIC_URL não configurado');
  const oapp = await getOauthApp(platform);
  if (!oapp) return res.status(400).send('App OAuth não configurado para ' + platform);
  const redirectUri = `${PUBLIC_URL}/oauth/${platform}/callback`;
  const state = nanoid();
  pendingStates.add(state);
  setTimeout(() => pendingStates.delete(state), 600000);
  try {
    res.redirect(buildAuthUrl(platform, oapp, redirectUri, state));
  } catch (e) {
    res.status(400).send(String(e instanceof Error ? e.message : e));
  }
});

// --- callback OAuth (a rede chama aqui; sem auth) ---
app.get('/oauth/:platform/callback', async (req, res) => {
  const platform = (req.params as Record<string, string>).platform;
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const err = typeof req.query.error === 'string' ? req.query.error : '';
  if (err) return res.status(400).send(page('Autorização negada', err));
  if (!code) return res.status(400).send(page('Erro', 'Código de autorização ausente.'));
  if (!PUBLIC_URL) return res.status(500).send('WORKER_PUBLIC_URL não configurado');
  const oapp = await getOauthApp(platform);
  if (!oapp) return res.status(400).send(page('Erro', 'App OAuth não configurado.'));
  const redirectUri = `${PUBLIC_URL}/oauth/${platform}/callback`;
  try {
    const r = await exchangeCode(platform, oapp, redirectUri, code);
    const id = `${platform}:${r.accountId}`;
    await upsertAccount({
      id, platform, accountId: r.accountId, displayName: r.displayName,
      accessToken: r.accessToken, refreshToken: r.refreshToken,
      expiresAt: r.expiresIn ? Date.now() + r.expiresIn * 1000 : undefined,
    });
    pendingStates.delete(state);
    res.send(page('Conta conectada', `${r.displayName || r.accountId} conectada com sucesso.`));
  } catch (e) {
    res.status(400).send(page('Falha ao conectar', String(e instanceof Error ? e.message : e)));
  }
});

// --- contas conectadas ---
app.get('/accounts', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
  const accs = await listAccounts(platform);
  res.json({ accounts: accs.map((a) => ({ id: a.id, platform: a.platform, accountId: a.accountId, displayName: a.displayName })) });
});
app.delete('/accounts/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const ok = await removeAccount((req.params as Record<string, string>).id);
  res.json({ ok });
});

// --- credenciais genéricas por rede (compat: instagram/facebook/tiktok) ---
app.post('/creds/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = (req.params as Record<string, string>).platform;
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'corpo deve ser um objeto' });
  await setPlatformCreds(platform, data as Record<string, unknown>);
  res.json({ ok: true });
});
app.get('/creds/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasPlatformCreds((req.params as Record<string, string>).platform) });
});

// --- agendamento ---
app.post('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body as { file?: string; title?: string; description?: string; tags?: unknown; at?: number; platform?: string; accountId?: string };
  if (!b?.file || !b?.at) return res.status(400).json({ error: 'file e at são obrigatórios' });
  const platform = (PLATFORMS as string[]).includes(String(b.platform)) ? (b.platform as PlatformId) : 'youtube';
  const post = await addPost({
    platform,
    file: String(b.file),
    title: String(b.title ?? 'Novo vídeo').slice(0, 100),
    description: String(b.description ?? ''),
    tags: Array.isArray(b.tags) ? (b.tags as unknown[]).map((t) => String(t)).slice(0, 25) : [],
    at: Number(b.at),
    accountId: b.accountId ? String(b.accountId) : undefined,
  });
  res.json({ ok: true, post });
});
app.get('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ posts: await listPosts() });
});
app.delete('/schedule/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: await removePost((req.params as Record<string, string>).id) });
});

// --- jobs ---
app.post('/jobs', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const request = req.body as JobRequest;
  if (!request || !request.type) return res.status(400).json({ error: 'type é obrigatório' });
  const id = nanoid();
  const rec: JobRecord = { id, request, status: 'queued', createdAt: Date.now(), output: '' };
  jobs.set(id, rec);
  void execute(rec);
  res.json({ id, status: rec.status });
});
app.get('/jobs/:id', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get((req.params as Record<string, string>).id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});
app.get('/jobs/:id/events', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get((req.params as Record<string, string>).id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (e: JobEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  send({ jobId: rec.id, kind: 'status', status: rec.status, ts: Date.now() });
  if (rec.output) send({ jobId: rec.id, kind: 'stdout', data: rec.output, ts: Date.now() });
  const set = listeners.get(rec.id) ?? new Set();
  set.add(send);
  listeners.set(rec.id, set);
  req.on('close', () => set.delete(send));
});

async function execute(rec: JobRecord) {
  rec.status = 'running';
  emit(rec.id, { kind: 'status', status: 'running' });
  const onChunk = (kind: 'stdout' | 'stderr', data: string) => emit(rec.id, { kind, data });
  try {
    switch (rec.request.type) {
      case 'shell': { const out = await runShell(rec.request, onChunk); rec.exitCode = out.exitCode; rec.result = out.result; if (out.exitCode !== 0) throw new Error(`exit code ${out.exitCode}`); break; }
      case 'git': { const out = await runGit(rec.request, onChunk); rec.exitCode = out.exitCode; rec.result = out.result; if (out.exitCode !== 0) throw new Error(`git exit code ${out.exitCode}`); break; }
      case 'writeFile': rec.result = (await writeFile(rec.request)).result; break;
      case 'readFile': rec.result = (await readFile(rec.request)).result; break;
      case 'browser': rec.result = (await runBrowser(rec.request, onChunk)).result; break;
      case 'ytFetch': rec.result = (await runYtFetch(rec.request, onChunk)).result; break;
      case 'clip': rec.result = (await runClip(rec.request, onChunk)).result; break;
      case 'publishYoutube': rec.result = (await runPublishYoutube(rec.request, onChunk)).result; break;
      case 'publishInstagram': rec.result = (await runPublishInstagram(rec.request, onChunk)).result; break;
      case 'publishFacebook': rec.result = (await runPublishFacebook(rec.request, onChunk)).result; break;
      case 'publishTiktok': rec.result = (await runPublishTiktok(rec.request, onChunk)).result; break;
      default: throw new Error(`tipo de job desconhecido: ${(rec.request as JobRequest).type}`);
    }
    rec.status = 'done'; rec.finishedAt = Date.now();
    emit(rec.id, { kind: 'result', result: rec.result });
    emit(rec.id, { kind: 'status', status: 'done' });
  } catch (err) {
    rec.status = 'error'; rec.error = err instanceof Error ? err.message : String(err); rec.finishedAt = Date.now();
    emit(rec.id, { kind: 'stderr', data: rec.error });
    emit(rec.id, { kind: 'status', status: 'error' });
  }
}

// --- AGENDADOR ---
function buildCaption(post: ScheduledPost): string {
  const tags = post.tags.map((t) => `#${t}`).join(' ');
  return [post.title, post.description, tags].filter(Boolean).join('\n\n').slice(0, 2200);
}

async function publishPost(post: ScheduledPost): Promise<{ url?: string }> {
  const noop = () => {};
  if (post.platform === 'youtube') {
    const c = await getYoutubeCreds();
    if (!c) throw new Error('Credenciais do YouTube não configuradas');
    const out = await runPublishYoutube({ type: 'publishYoutube', payload: { file: post.file, title: post.title, description: post.description, tags: post.tags, privacyStatus: c.privacyStatus ?? 'public', clientId: c.clientId, clientSecret: c.clientSecret, refreshToken: c.refreshToken } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'instagram') {
    const c = await getPlatformCreds('instagram');
    if (!c) throw new Error('Credenciais do Instagram não configuradas');
    const out = await runPublishInstagram({ type: 'publishInstagram', payload: { file: post.file, caption: buildCaption(post), igUserId: c.igUserId, accessToken: c.accessToken } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'facebook') {
    const c = await getPlatformCreds('facebook');
    if (!c) throw new Error('Credenciais do Facebook não configuradas');
    const out = await runPublishFacebook({ type: 'publishFacebook', payload: { file: post.file, caption: buildCaption(post), pageId: c.pageId, accessToken: c.accessToken } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'tiktok') {
    if (post.accountId) {
      const acc = await getAccount(post.accountId);
      if (!acc || !acc.refreshToken) throw new Error('Conta TikTok não encontrada ou sem token');
      const oapp = await getOauthApp('tiktok');
      if (!oapp) throw new Error('App OAuth do TikTok não configurado');
      const tok = await refreshTiktok(oapp.clientId, oapp.clientSecret, acc.refreshToken);
      await updateAccountTokens(acc.id, { accessToken: tok.accessToken, refreshToken: tok.refreshToken ?? acc.refreshToken, expiresAt: tok.expiresIn ? Date.now() + tok.expiresIn * 1000 : undefined });
      const r = await publishTiktokWithToken(tok.accessToken, { file: post.file, title: buildCaption(post), privacyLevel: (acc.extra as any)?.privacyLevel, cwd: undefined }, noop);
      return { url: r.url };
    }
    const c = await getPlatformCreds('tiktok');
    if (!c) throw new Error('Credenciais do TikTok não configuradas');
    const out = await runPublishTiktok({ type: 'publishTiktok', payload: { file: post.file, title: buildCaption(post), clientKey: c.clientKey, clientSecret: c.clientSecret, refreshToken: c.refreshToken, privacyLevel: c.privacyLevel } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  throw new Error(`Publicação em ${post.platform} ainda não suportada`);
}

let ticking = false;
async function schedulerTick() {
  if (ticking) return;
  ticking = true;
  try {
    const due = await getDuePosts(Date.now());
    for (const post of due) {
      await updatePost(post.id, { status: 'publishing' });
      try {
        const r = await publishPost(post);
        await updatePost(post.id, { status: 'done', url: r?.url });
        console.log(`[scheduler] publicado ${post.platform} ${post.id} → ${r?.url ?? ''}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await updatePost(post.id, { status: 'error', error: msg });
        console.error(`[scheduler] erro em ${post.id}: ${msg}`);
      }
    }
  } catch (e) {
    console.error('[scheduler] tick falhou:', e instanceof Error ? e.message : e);
  } finally {
    ticking = false;
  }
}
setInterval(() => { schedulerTick().catch(() => {}); }, 30000);

setInterval(() => { schedulerTick().catch(() => {}); }, 30000);

// --- Plugin Capabilities (kernel) ---
app.get('/api/plugins', (_req, res) => {
  try {
    const caps = listCapabilities().map((e) => ({ id: e.capability.id, name: e.capability.name, pluginId: e.pluginId }));
    res.json({ capabilities: caps });
  } catch (e) {
    res.status(503).json({ error: 'kernel not ready', detail: String(e instanceof Error ? e.message : e) });
  }
});

app.post('/api/plugins/:capability', async (req, res) => {
  try {
    const capId = (req.params as Record<string, string>).capability;
    const input = req.body ?? {};
    const result = await executeCapability(capId, input);
    res.json({ ok: true, capability: capId, result });
  } catch (e) {
    res.status(400).json({ error: String(e instanceof Error ? e.message : e) });
  }
});

app.listen(PORT, () => {
  console.log(`[beehive-worker] porta ${PORT} · storage=${storageMode()} · public=${PUBLIC_URL ? 'on' : 'off'} · agendador on`);
});
