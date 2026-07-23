// BeeHive Cowork Nuvem — servidor do worker.
// Executa jobs (shell/files/git/browser/cortes/publish) e roda o AGENDADOR, que
// publica posts agendados sozinho em cada rede. Persistência: Supabase ou arquivo.
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
import { runPublishTiktok } from './executors/publishTiktok.js';
import {
  getYoutubeCreds, setYoutubeCreds, hasYoutubeCreds,
  getPlatformCreds, setPlatformCreds, hasPlatformCreds,
  listPosts, getDuePosts, addPost, updatePost, removePost, storageMode,
  type ScheduledPost, type PlatformId,
} from './store.js';
import type { JobEvent, JobRecord, JobRequest } from './types.js';

const PORT = Number(process.env.PORT ?? 4000);
const AUTH_TOKEN = process.env.WORKER_TOKEN ?? '';
const PLATFORMS: PlatformId[] = ['youtube', 'instagram', 'facebook', 'tiktok'];

ensureWorkspace();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- estado em memória ---
const jobs = new Map<string, JobRecord>();
const listeners = new Map<string, Set<(e: JobEvent) => void>>();

function emit(jobId: string, e: Omit<JobEvent, 'jobId' | 'ts'>) {
  const evt: JobEvent = { jobId, ts: Date.now(), ...e };
  const rec = jobs.get(jobId);
  if (rec && (e.kind === 'stdout' || e.kind === 'stderr')) rec.output += e.data ?? '';
  listeners.get(jobId)?.forEach((fn) => fn(evt));
}

// --- auth ---
function authOk(req: express.Request): boolean {
  if (!AUTH_TOKEN) return true;
  const header = req.header('authorization') ?? '';
  return header === `Bearer ${AUTH_TOKEN}`;
}

// --- health ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'beehive-worker', workspace: WORKSPACE_ROOT, jobs: jobs.size, storage: storageMode() });
});

// --- download de arquivos do workspace (clipes, etc). Token via header ou ?t= ---
app.get('/files/:name(*)', (req, res) => {
  const q = typeof req.query.t === 'string' ? req.query.t : '';
  const ok = !AUTH_TOKEN || req.header('authorization') === `Bearer ${AUTH_TOKEN}` || q === AUTH_TOKEN;
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  try {
    const abs = resolveInWorkspace((req.params as Record<string, string>).name);
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'not found' });
    res.sendFile(abs);
  } catch {
    res.status(400).json({ error: 'bad path' });
  }
});

// --- credenciais do YouTube (formato específico + privacidade) ---
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

// --- credenciais genéricas por rede (instagram/facebook/tiktok) ---
app.post('/creds/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const platform = (req.params as Record<string, string>).platform;
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'corpo deve ser um objeto com as credenciais' });
  await setPlatformCreds(platform, data as Record<string, unknown>);
  res.json({ ok: true });
});

app.get('/creds/:platform', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ configured: await hasPlatformCreds((req.params as Record<string, string>).platform) });
});

// --- agendamento de posts ---
app.post('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body as { file?: string; title?: string; description?: string; tags?: unknown; at?: number; platform?: string };
  if (!b?.file || !b?.at) return res.status(400).json({ error: 'file e at (epoch ms) são obrigatórios' });
  const platform = (PLATFORMS as string[]).includes(String(b.platform)) ? (b.platform as PlatformId) : 'youtube';
  const post = await addPost({
    platform,
    file: String(b.file),
    title: String(b.title ?? 'Novo vídeo').slice(0, 100),
    description: String(b.description ?? ''),
    tags: Array.isArray(b.tags) ? (b.tags as unknown[]).map((t) => String(t)).slice(0, 25) : [],
    at: Number(b.at),
  });
  res.json({ ok: true, post });
});

app.get('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json({ posts: await listPosts() });
});

app.delete('/schedule/:id', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const ok = await removePost(req.params.id);
  res.json({ ok });
});

// --- criar job ---
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
  const rec = jobs.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

app.get('/jobs/:id/events', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get(req.params.id);
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

// --- pipeline de execução ---
async function execute(rec: JobRecord) {
  rec.status = 'running';
  emit(rec.id, { kind: 'status', status: 'running' });
  const onChunk = (kind: 'stdout' | 'stderr', data: string) => emit(rec.id, { kind, data });
  try {
    switch (rec.request.type) {
      case 'shell': {
        const out = await runShell(rec.request, onChunk);
        rec.exitCode = out.exitCode; rec.result = out.result;
        if (out.exitCode !== 0) throw new Error(`exit code ${out.exitCode}`);
        break;
      }
      case 'git': {
        const out = await runGit(rec.request, onChunk);
        rec.exitCode = out.exitCode; rec.result = out.result;
        if (out.exitCode !== 0) throw new Error(`git exit code ${out.exitCode}`);
        break;
      }
      case 'writeFile': rec.result = (await writeFile(rec.request)).result; break;
      case 'readFile': rec.result = (await readFile(rec.request)).result; break;
      case 'browser': rec.result = (await runBrowser(rec.request, onChunk)).result; break;
      case 'ytFetch': rec.result = (await runYtFetch(rec.request, onChunk)).result; break;
      case 'clip': rec.result = (await runClip(rec.request, onChunk)).result; break;
      case 'publishYoutube': rec.result = (await runPublishYoutube(rec.request, onChunk)).result; break;
      case 'publishInstagram': rec.result = (await runPublishInstagram(rec.request, onChunk)).result; break;
      case 'publishFacebook': rec.result = (await runPublishFacebook(rec.request, onChunk)).result; break;
      case 'publishTiktok': rec.result = (await runPublishTiktok(rec.request, onChunk)).result; break;
      default:
        throw new Error(`tipo de job desconhecido: ${(rec.request as JobRequest).type}`);
    }
    rec.status = 'done'; rec.finishedAt = Date.now();
    emit(rec.id, { kind: 'result', result: rec.result });
    emit(rec.id, { kind: 'status', status: 'done' });
  } catch (err) {
    rec.status = 'error';
    rec.error = err instanceof Error ? err.message : String(err);
    rec.finishedAt = Date.now();
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
    const out = await runPublishYoutube({ type: 'publishYoutube', payload: {
      file: post.file, title: post.title, description: post.description, tags: post.tags,
      privacyStatus: c.privacyStatus ?? 'public', clientId: c.clientId, clientSecret: c.clientSecret, refreshToken: c.refreshToken,
    } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'instagram') {
    const c = await getPlatformCreds('instagram');
    if (!c) throw new Error('Credenciais do Instagram não configuradas');
    const out = await runPublishInstagram({ type: 'publishInstagram', payload: {
      file: post.file, caption: buildCaption(post), igUserId: c.igUserId, accessToken: c.accessToken,
    } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'facebook') {
    const c = await getPlatformCreds('facebook');
    if (!c) throw new Error('Credenciais do Facebook não configuradas');
    const out = await runPublishFacebook({ type: 'publishFacebook', payload: {
      file: post.file, caption: buildCaption(post), pageId: c.pageId, accessToken: c.accessToken,
    } } as JobRequest, noop);
    return out.result as { url?: string };
  }
  if (post.platform === 'tiktok') {
    const c = await getPlatformCreds('tiktok');
    if (!c) throw new Error('Credenciais do TikTok não configuradas');
    const out = await runPublishTiktok({ type: 'publishTiktok', payload: {
      file: post.file, title: buildCaption(post), clientKey: c.clientKey, clientSecret: c.clientSecret, refreshToken: c.refreshToken, privacyLevel: c.privacyLevel,
    } } as JobRequest, noop);
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

app.listen(PORT, () => {
  console.log(`[beehive-worker] porta ${PORT} · workspace=${WORKSPACE_ROOT} · auth=${AUTH_TOKEN ? 'on' : 'off'} · storage=${storageMode()} · agendador on`);
});
