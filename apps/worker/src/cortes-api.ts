// Cortes API Routes - Gerencia projetos, canais, contas sociais e configurações
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { runYtFetch, runUploadedVideoFetch, runClip } from './executors/media.js';
import type { JobRequest } from './types.js';
import { resolveInWorkspace } from './workspace.js';
import { addPost } from './store.js';

const router = Router();

// Caminho para salvar dados
const DATA_DIR = process.env.CORTES_DATA_DIR || 
  process.env.RAILWAY_VOLUME_PATH ||
  path.join(process.cwd(), 'workspace', 'data', 'cortes');

// Garante que o diretório existe
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('⚠️ Não foi possível criar diretório de dados:', e);
  }
}

// Helper functions
function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filepath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filepath)) {
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8')) as T;
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function writeJsonFile(filename: string, data: any) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Erro ao escrever arquivo:', e);
  }
}

// Carga inicial dos dados
let channels = readJsonFile<CorteChannel[]>('channels.json', []);
let socialAccounts = readJsonFile<CorteSocialAccount[]>('social-accounts.json', []);
let projects = readJsonFile<CorteProject[]>('projects.json', []);
let settings = readJsonFile<CorteSettings | null>('settings.json', null);

// Salvar automaticamente quando modificar
function saveChannels() { writeJsonFile('channels.json', channels); }
function saveSocialAccounts() { writeJsonFile('social-accounts.json', socialAccounts); }
function saveProjects() { writeJsonFile('projects.json', projects); }
function saveSettings() { writeJsonFile('settings.json', settings); }

// ── Canais ────────────────────────────────────────────────────────────────────

router.get('/channels', (_req, res) => {
  res.json(channels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post('/channels', (req, res) => {
  const { name, category, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const channel: CorteChannel = {
    id: `ch_${Date.now()}`,
    name: name.trim(),
    category: category?.trim() || null,
    description: description?.trim() || null,
    socialAccountIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  channels.push(channel);
  saveChannels();
  res.json(channel);
});

router.patch('/channels/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = channels.findIndex(c => c.id === id);
  if (index === -1) return res.status(404).json({ error: 'Canal não encontrado' });
  
  channels[index] = { ...channels[index], ...updates, updatedAt: new Date().toISOString() };
  saveChannels();
  res.json(channels[index]);
});

router.delete('/channels/:id', (req, res) => {
  const { id } = req.params;
  channels = channels.filter(c => c.id !== id);
  socialAccounts = socialAccounts.filter((account) => !account.channelIds.includes(id));
  saveChannels();
  saveSocialAccounts();
  res.json({ ok: true });
});

// ── Redes Sociais ─────────────────────────────────────────────────────────────

router.get('/social-accounts', (_req, res) => {
  res.json(socialAccounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.post('/social-accounts', (req, res) => {
  const { platform, accountId, displayName, handle, channelId } = req.body;
  if (!platform || !accountId || !channelId) return res.status(400).json({ error: 'Platform, accountId e persona sao obrigatorios' });
  const channel = channels.find((item) => item.id === channelId);
  if (!channel) return res.status(404).json({ error: 'Persona nao encontrada' });
  
  const account: CorteSocialAccount = {
    id: `sa_${Date.now()}`,
    platform,
    accountId,
    displayName: displayName?.trim() || null,
    handle: handle?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    channelIds: [channelId],
  };
  socialAccounts.push(account);
  if (!channel.socialAccountIds.includes(account.id)) {
    channel.socialAccountIds.push(account.id);
    channel.updatedAt = new Date().toISOString();
    saveChannels();
  }
  saveSocialAccounts();
  res.json(account);
});

router.delete('/social-accounts/:id', (req, res) => {
  const { id } = req.params;
  const account = socialAccounts.find((item) => item.id === id);
  socialAccounts = socialAccounts.filter((item) => item.id !== id);
  if (account) {
    channels = channels.map((channel) => channel.socialAccountIds.includes(id)
      ? { ...channel, socialAccountIds: channel.socialAccountIds.filter((accountId) => accountId !== id), updatedAt: new Date().toISOString() }
      : channel);
    saveChannels();
  }
  saveSocialAccounts();
  res.json({ ok: true });
});

// ── Projetos ──────────────────────────────────────────────────────────────────

router.get('/projects', (_req, res) => {
  res.json(projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

router.get('/projects/:id', (req, res) => {
  const { id } = req.params;
  const project = projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
  res.json(project);
});

router.post('/projects', (req, res) => {
  const {
    url, name, channelId, quantity, duration, format,
    autoHighlights, autoCaptions, autoTitle, autoDescription, autoHashtags,
  } = req.body;
  
  if (!url || !name) return res.status(400).json({ error: 'URL e nome são obrigatórios' });
  
  const project: CorteProject = {
    id: `cp_${Date.now()}`,
    name: name.trim(),
    sourceVideoUrl: url.trim(),
    duration: duration || 15,
    format: format || '9:16',
    quantityRequested: quantity || 3,
    autoHighlights: autoHighlights ?? true,
    autoCaptions: autoCaptions ?? true,
    autoTitle: autoTitle ?? true,
    autoDescription: autoDescription ?? true,
    autoHashtags: autoHashtags ?? true,
    status: 'PENDING',
    clips: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(channelId ? { channelId } : {}),
  };
  projects.push(project);
  saveProjects();
  res.json(project);
});

// Upload direto: o vídeo fica no volume persistente e não depende de YouTube.
router.post('/upload', (req, res) => {
  const requestedName = String(req.headers['x-file-name'] || 'video.mp4');
  const ext = path.extname(requestedName).toLowerCase();
  const allowed = new Set(['.mp4', '.mov', '.mkv', '.webm']);
  const declaredSize = Number(req.headers['content-length'] || 0);
  const maxBytes = 500 * 1024 * 1024;
  if (!allowed.has(ext)) return res.status(400).json({ error: 'Envie um vídeo MP4, MOV, MKV ou WEBM.' });
  if (declaredSize > maxBytes) return res.status(413).json({ error: 'O vídeo excede o limite de 500 MB.' });
  const relativeFile = `uploads/upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const target = resolveInWorkspace(relativeFile);
  const temporary = `${target}.uploading`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const destination = fs.createWriteStream(temporary);
  let received = 0;
  let failed = false;
  const fail = (status: number, error: string) => {
    if (failed || res.headersSent) return;
    failed = true;
    destination.destroy();
    fs.rmSync(temporary, { force: true });
    res.status(status).json({ error });
  };
  req.on('data', (chunk: Buffer) => {
    received += chunk.length;
    if (received > maxBytes) { req.destroy(); fail(413, 'O vídeo excede o limite de 500 MB.'); }
  });
  req.on('error', () => fail(400, 'O envio do vídeo foi interrompido. Tente novamente.'));
  destination.on('error', () => fail(500, 'Não foi possível salvar o vídeo enviado.'));
  destination.on('finish', () => {
    if (failed) return;
    fs.renameSync(temporary, target);
    res.status(201).json({ sourceUrl: `upload://${relativeFile}`, fileName: requestedName, size: received });
  });
  req.pipe(destination);
});
router.patch('/projects/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  
  projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  saveProjects();
  res.json(projects[index]);
});

router.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  projects = projects.filter(p => p.id !== id);
  saveProjects();
  res.json({ ok: true });
});

// ── Configurações ────────────────────────────────────────────────────────────

router.get('/settings', (_req, res) => {
  if (!settings) {
    settings = {
      id: 'default',
      subtitleFontSize: 24,
      subtitleFontFamily: 'Arial',
      subtitleVerticalPos: 'bottom',
      subtitleMaxChars: 20,
      subtitleColor: '#FFFFFF',
      activeWordColor: 'YELLOW',
      activeWordSize: 110,
      subtitleStyle: 'outline',
      lineSpacing: 120,
      videoQuality: '720p',
      defaultDuration: 15,
      defaultQuantity: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSettings();
  }
  res.json(settings);
});

router.post('/settings', (req, res) => {
  const updates = req.body;
  if (settings) {
    settings = { ...settings, ...updates, updatedAt: new Date().toISOString() };
  } else {
    settings = {
      id: 'default',
      subtitleFontSize: updates.subtitleFontSize || 24,
      subtitleFontFamily: updates.subtitleFontFamily || 'Arial',
      subtitleVerticalPos: updates.subtitleVerticalPos || 'bottom',
      subtitleMaxChars: updates.subtitleMaxChars || 20,
      subtitleColor: updates.subtitleColor || '#FFFFFF',
      activeWordColor: updates.activeWordColor || 'YELLOW',
      activeWordSize: updates.activeWordSize || 110,
      subtitleStyle: updates.subtitleStyle || 'outline',
      lineSpacing: updates.lineSpacing || 120,
      videoQuality: updates.videoQuality || '720p',
      defaultDuration: updates.defaultDuration || 15,
      defaultQuantity: updates.defaultQuantity || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  saveSettings();
  res.json(settings);
});


// A fila usa o modo API do gerador: download, transcricao e renderizacao sao
// processados na nuvem. O browser do cliente nunca executa esse trabalho.
type CorteJob = { id: string; projectId: string; status: 'queued' | 'running' | 'done' | 'error'; progress: number; message: string; error?: string };
const jobs = new Map<string, CorteJob>();

router.post('/generate', (req, res) => {
  const projectId = String(req.body?.projectId || '');
  const project = projects.find((item) => item.id === projectId);
  if (!project) return res.status(404).json({ error: 'Projeto nao encontrado' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'GROQ_API_KEY ainda nao esta configurada no worker de nuvem.' });
  const job: CorteJob = { id: `cj_${Date.now()}`, projectId, status: 'queued', progress: 0, message: 'Na fila para processamento em nuvem' };
  jobs.set(job.id, job);
  project.status = 'GENERATING'; project.error = undefined; project.updatedAt = new Date().toISOString(); saveProjects();
  void runGeneration(job, project);
  res.status(202).json({ jobId: job.id });
});

router.get('/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Processamento nao encontrado. Atualize o projeto para ver o resultado.' });
  res.json(job);
});

router.post('/projects/:id/schedule', async (req, res) => {
  const project = projects.find((item) => item.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Projeto nao encontrado' });
  const postsPerDay = Math.max(1, Math.min(10, Number(req.body?.postsPerDay) || 1));
  const times = Array.isArray(req.body?.times) ? req.body.times.map((value: unknown) => String(value)).filter((value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)).slice(0, postsPerDay) : [];
  if (times.length !== postsPerDay) return res.status(400).json({ error: 'Informe um horario valido para cada postagem diaria.' });
  const account = socialAccounts.find((item) => item.channelIds.includes(project.channelId || '') && item.platform === 'youtube');
  if (!account) return res.status(409).json({ error: 'Conecte uma conta do YouTube a esta persona antes de agendar.' });
  const pending = project.clips.filter((clip) => clip.status === 'READY');
  if (!pending.length) return res.status(400).json({ error: 'Nao ha cortes prontos para agendar.' });
  const now = new Date();
  const scheduled = [] as CorteClip[];
  for (let index = 0; index < pending.length; index++) {
    const clip = pending[index]; const day = Math.floor(index / postsPerDay); const [hour, minute] = times[index % postsPerDay].split(':').map(Number);
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute, 0, 0);
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    await addPost({ platform: 'youtube', file: clip.videoFile || '', title: clip.title || `Corte ${clip.index}`, description: clip.description || clip.caption || '', tags: clip.hashtags || [], at: at.getTime(), accountId: `youtube:${account.accountId}` });
    clip.status = 'SCHEDULED'; clip.scheduledAt = at.toISOString(); clip.updatedAt = new Date().toISOString(); scheduled.push(clip);
  }
  project.postingSchedule = { postsPerDay, times }; project.updatedAt = new Date().toISOString(); saveProjects();
  res.json({ ok: true, scheduled });
});
router.post('/clips/:id/schedule', async (req, res) => {
  const clip = findClip(req.params.id);
  if (!clip) return res.status(404).json({ error: 'Corte nao encontrado' });
  if (clip.status === 'PUBLISHED') return res.status(409).json({ error: 'Este corte já foi publicado.' });
  if (clip.status === 'SCHEDULED') return res.status(409).json({ error: 'Este corte já está agendado. Cancele-o antes de escolher outro horário.' });
  const scheduledAt = String(req.body?.scheduledAt || '');
  const scheduledTime = Date.parse(scheduledAt);
  if (Number.isNaN(scheduledTime) || scheduledTime <= Date.now()) return res.status(400).json({ error: 'Escolha uma data e horário no futuro.' });
  const project = projects.find((item) => item.id === clip.projectId);
  const account = socialAccounts.find((item) => item.channelIds.includes(project?.channelId || '') && item.platform === 'youtube');
  if (!account || !clip.videoFile) return res.status(409).json({ error: 'Conecte o YouTube desta persona e gere o vídeo antes de agendar.' });
  await addPost({ platform: 'youtube', file: clip.videoFile, title: clip.title || `Corte ${clip.index}`, description: clip.description || clip.caption || '', tags: clip.hashtags || [], at: scheduledTime, accountId: `youtube:${account.accountId}`, origin: `corte:${clip.id}` });
  clip.scheduledAt = new Date(scheduledTime).toISOString(); clip.status = 'SCHEDULED'; clip.updatedAt = new Date().toISOString(); saveProjects();
  res.json(clip);
});
router.post('/clips/:id/publish', async (req, res) => {
  const clip = findClip(req.params.id);
  if (!clip) return res.status(404).json({ success: false, error: 'Corte nao encontrado' });
  const project = projects.find((item) => item.id === clip.projectId);
  const account = socialAccounts.find((item) => item.channelIds.includes(project?.channelId || '') && item.platform === 'youtube');
  if (clip.status !== 'READY') return res.status(409).json({ success: false, error: 'Este corte já está agendado ou publicado.' });
  if (!account || !clip.videoFile) return res.status(409).json({ success: false, error: 'Conecte o YouTube desta persona e gere o video antes de publicar.' });
  const at = Date.now();
  await addPost({ platform: 'youtube', file: clip.videoFile, title: clip.title || `Corte ${clip.index}`, description: clip.description || clip.caption || '', tags: clip.hashtags || [], at, accountId: `youtube:${account.accountId}` });
  clip.status = 'SCHEDULED'; clip.scheduledAt = new Date(at).toISOString(); clip.updatedAt = new Date().toISOString(); saveProjects();
  res.json({ success: true, clip, message: 'Teste colocado na fila. O envio inicia em ate 30 segundos.' });
});

function findClip(id: string): CorteClip | undefined { return projects.flatMap((project) => project.clips).find((clip) => clip.id === id); }

export function markCorteClipPublication(clipId: string, status: 'PUBLISHED' | 'ERROR', error?: string): void {
  const clip = findClip(clipId);
  if (!clip) return;
  clip.status = status;
  clip.updatedAt = new Date().toISOString();
  if (status === 'PUBLISHED') { clip.publishedAt = new Date().toISOString(); clip.error = undefined; }
  else clip.error = error || 'Falha na publicacao';
  saveProjects();
}

async function runGeneration(job: CorteJob, project: CorteProject): Promise<void> {
  job.status = 'running'; job.progress = 8; job.message = 'Baixando video e legendas no worker de nuvem';
  const workspace = `cortes/${project.id}/${job.id}`;
  const log = (_kind: 'stdout' | 'stderr', text: string) => { job.message = text.replace(/\s+/g, ' ').trim().slice(0, 140) || job.message; job.progress = Math.min(88, job.progress + 2); };
  try {
    const fetched = project.sourceVideoUrl.startsWith('upload://')
      ? await runUploadedVideoFetch({ type: 'ytFetch', cwd: workspace, payload: { file: project.sourceVideoUrl.slice('upload://'.length) } } as JobRequest, log)
      : await runYtFetch({ type: 'ytFetch', cwd: workspace, payload: { url: project.sourceVideoUrl } } as JobRequest, log);
    const source = fetched.result as { video: string; srt: string | null; transcript: string; duration: number };
    if (!source.srt || !source.transcript) throw new Error('Nao foi possivel obter uma transcricao. Tente um video com fala ou legenda.');
    job.progress = 35; job.message = 'A IA esta escolhendo os melhores momentos';
    const segments = await chooseHighlights(source.transcript, project.quantityRequested, project.duration);
    if (!segments.length) throw new Error('A IA nao encontrou momentos fortes suficientes para criar cortes.');
    job.progress = 55; job.message = `Renderizando ${segments.length} corte(s) com legendas dinamicas`;
    const rendered = await runClip({ type: 'clip', cwd: workspace, payload: { input: source.video, srt: source.srt, segments, vertical: project.format === '9:16' } } as JobRequest, log);
    const output = rendered.result as { clips: Array<{ file: string; thumbnail?: string; title?: string; start: number; end: number }> };
    const publicBase = (process.env.WORKER_PUBLIC_URL || '').replace(/\/$/, '');
    project.clips = output.clips.map((item, index) => ({ id: `cc_${project.id}_${index + 1}`, projectId: project.id, index: index + 1, startTime: item.start, endTime: item.end, videoFile: `${publicBase}/files/${workspace}/${item.file}`, thumbnailFile: item.thumbnail ? `${publicBase}/files/${workspace}/${item.thumbnail}` : youtubeThumbnail(project.sourceVideoUrl), title: item.title || `Corte ${index + 1}`, caption: '', description: '', hashtags: [], status: 'READY', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    project.status = 'READY'; project.updatedAt = new Date().toISOString(); job.status = 'done'; job.progress = 100; job.message = `${project.clips.length} corte(s) prontos para revisar`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error); project.status = 'ERROR'; project.error = message; project.updatedAt = new Date().toISOString(); job.status = 'error'; job.error = message; job.message = 'Falha no processamento';
  }
  saveProjects();
}

async function chooseHighlights(transcript: string, quantity: number, duration: number): Promise<Array<{ start: number; end: number; title: string }>> {
  const prompt = `Analise esta transcricao de video e encontre exatamente ate ${Math.max(1, Math.min(10, quantity))} momentos independentes com alto potencial para video curto. Cada trecho deve durar aproximadamente ${Math.max(8, Math.min(180, duration))} segundos, ter inicio forte, fim natural e nao se sobrepor. Retorne SOMENTE JSON valido: {"segments":[{"start":12.3,"end":42.3,"title":"titulo curto"}]}. Use exclusivamente timestamps presentes na transcricao.\n\nTRANSCRICAO:\n${transcript.slice(0, 100000)}`;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.35, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Voce e um editor de videos curtos. Responda somente JSON.' }, { role: 'user', content: prompt }] }) });
  if (!res.ok) throw new Error(`Groq falhou ao analisar a transcricao (HTTP ${res.status}).`);
  const data = await res.json() as any;
  const raw = data?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  return (Array.isArray(parsed?.segments) ? parsed.segments : []).map((item: any) => ({ start: Number(item.start), end: Number(item.end), title: String(item.title || 'Corte viral') })).filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start).slice(0, Math.max(1, Math.min(10, quantity)));
}
function youtubeThumbnail(url: string): string | undefined { const id = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/)?.[1]; return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined; }
// Types (simple interfaces for this module)
interface CorteChannel {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  socialAccountIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface CorteSocialAccount {
  id: string;
  platform: string;
  accountId: string;
  displayName: string | null;
  handle: string | null;
  createdAt: string;
  updatedAt: string;
  channelIds: string[];
}

interface CorteProject {
  id: string;
  name: string;
  sourceVideoUrl: string;
  duration: number;
  format: string;
  quantityRequested: number;
  autoHighlights: boolean;
  autoCaptions: boolean;
  autoTitle: boolean;
  autoDescription: boolean;
  autoHashtags: boolean;
  status: 'PENDING' | 'GENERATING' | 'READY' | 'ERROR' | 'PUBLISHED';
  error?: string;
  channelId?: string;
  postingSchedule?: { postsPerDay: number; times: string[] };
  clips: CorteClip[];
  createdAt: string;
  updatedAt: string;
}

interface CorteClip {
  id: string;
  projectId: string;
  index: number;
  startTime: number;
  endTime: number;
  videoFile?: string;
  thumbnailFile?: string;
  title: string;
  caption: string;
  description?: string;
  hashtags?: string[];
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
  updatedAt: string;
  createdAt: string;
}

interface CorteSettings {
  id: string;
  subtitleFontSize: number;
  subtitleFontFamily: string;
  subtitleVerticalPos: string;
  subtitleMaxChars: number;
  subtitleColor: string;
  activeWordColor: string;
  activeWordSize: number;
  subtitleStyle: string;
  lineSpacing: number;
  videoQuality: string;
  defaultDuration: number;
  defaultQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export default router;
