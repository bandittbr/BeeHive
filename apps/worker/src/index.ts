// BeeHive Cowork Nuvem — servidor do worker.
// Recebe jobs do orquestrador, executa de verdade (shell/files/git/browser/cortes/publish)
// e transmite eventos por SSE. Fila simples em memória (1 job por vez por padrão).
// Também roda o AGENDADOR: publica posts agendados sozinho, sem depender do navegador.
// Persistência via Supabase (se configurado) ou arquivo JSON no workspace.
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
import { getYoutubeCreds, setYoutubeCreds, hasYoutubeCreds, listPosts, getDuePosts, addPost, updatePost, removePost, storageMode } from './store.js';
import type { JobEvent, JobRecord, JobRequest } from './types.js';

const PORT = Number(process.env.PORT ?? 4000);
const AUTH_TOKEN = process.env.WORKER_TOKEN ?? '';

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
  if (!AUTH_TOKEN) return true; // sem token configurado = aberto (apenas dev)
  const header = req.header('authorization') ?? '';
  return header === `Bearer ${AUTH_TOKEN}`;
}

// --- health (usado pelo Railway healthcheck) ---
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

// --- credenciais do YouTube no servidor (para postagem automática) ---
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

// --- agendamento de posts ---
app.post('/schedule', async (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const b = req.body as { file?: string; title?: string; description?: string; tags?: unknown; at?: number };
  if (!b?.file || !b?.at) return res.status(400).json({ error: 'file e at (epoch ms) são obrigatórios' });
  const post = await addPost({
    platform: 'youtube',
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

  // executa em background; o cliente acompanha por /jobs/:id/events ou faz poll em /jobs/:id
  void execute(rec);
  res.json({ id, status: rec.status });
});

// --- consultar job (poll) ---
app.get('/jobs/:id', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

// --- stream de eventos (SSE) ---
app.get('/jobs/:id/events', (req, res) => {
  if (!authOk(req)) return res.status(401).json({ error: 'unauthorized' });
  const rec = jobs.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (e: JobEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  // replay do estado atual
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
        rec.exitCode = out.exitCode;
        rec.result = out.result;
        if (out.exitCode !== 0) throw new Error(`exit code ${out.exitCode}`);
        break;
      }
      case 'git': {
        const out = await runGit(rec.request, onChunk);
        rec.exitCode = out.exitCode;
        rec.result = out.result;
        if (out.exitCode !== 0) throw new Error(`git exit code ${out.exitCode}`);
        break;
      }
      case 'writeFile':
        rec.result = (await writeFile(rec.request)).result;
        break;
      case 'readFile':
        rec.result = (await readFile(rec.request)).result;
        break;
      case 'browser':
        rec.result = (await runBrowser(rec.request, onChunk)).result;
        break;
      case 'ytFetch':
        rec.result = (await runYtFetch(rec.request, onChunk)).result;
        break;
      case 'clip':
        rec.result = (await runClip(rec.request, onChunk)).result;
        break;
      case 'publishYoutube':
        rec.result = (await runPublishYoutube(rec.request, onChunk)).result;
        break;
      default:
        throw new Error(`tipo de job desconhecido: ${(rec.request as JobRequest).type}`);
    }
    rec.status = 'done';
    rec.finishedAt = Date.now();
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

// --- AGENDADOR: publica posts vencidos automaticamente ---
let ticking = false;
async function schedulerTick() {
  if (ticking) return;
  ticking = true;
  try {
    const creds = await getYoutubeCreds();
    if (!creds) return;
    const due = await getDuePosts(Date.now());
    for (const post of due) {
      await updatePost(post.id, { status: 'publishing' });
      try {
        const req = {
          type: 'publishYoutube',
          payload: {
            file: post.file,
            title: post.title,
            description: post.description,
            tags: post.tags,
            privacyStatus: creds.privacyStatus ?? 'public',
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
            refreshToken: creds.refreshToken,
          },
        } as JobRequest;
        const out = await runPublishYoutube(req, () => {});
        const r = out.result as { url?: string } | undefined;
        await updatePost(post.id, { status: 'done', url: r?.url });
        console.log(`[scheduler] publicado ${post.id} → ${r?.url ?? ''}`);
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
  console.log(`[beehive-worker] ouvindo na porta ${PORT} · workspace=${WORKSPACE_ROOT} · auth=${AUTH_TOKEN ? 'on' : 'off'} · storage=${storageMode()} · agendador on`);
});
