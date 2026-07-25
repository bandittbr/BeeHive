// Piloto automático de cortes — roda N automações independentes ("pilotos":
// ex. Humor, Terror, Tech), cada uma com seus próprios canais fonte e contas
// de destino (de beehive_accounts). Descobre vídeo novo, baixa+transcreve,
// pede pra IA os melhores momentos, corta em vertical com legenda animada e
// agenda a publicação nas contas escolhidas — reaproveitando executors/media.ts
// pro processamento e o agendador em index.ts pra publicar de verdade.
import { spawn } from 'node:child_process';
import { runYtFetch, runClip } from './executors/media.js';
import { executeCapability } from './kernel-bridge.js';
import {
  listPilots, listClipChannels, isVideoProcessed, addClipHistory,
  countPostsTodayByOrigin, addPost, getAccount,
  type ClipPilot,
} from './store.js';
import type { JobRequest } from './types.js';

const noop = () => {};

function runCapture(cmd: string, args: string[], timeoutMs = 60000): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: process.env });
    let out = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* ignore */ } }, timeoutMs);
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', () => { clearTimeout(timer); resolve(''); });
    child.on('close', () => { clearTimeout(timer); resolve(out); });
  });
}

interface DiscoveredVideo { id: string; title: string; url: string }

// Lista os últimos vídeos de um canal via yt-dlp (sem API key — usa a aba
// "Vídeos" do canal). Funciona com URL de canal, @handle, ou /videos direto.
async function discoverChannelVideos(channelUrl: string, limit = 15): Promise<DiscoveredVideo[]> {
  const out = await runCapture('yt-dlp', [
    '--flat-playlist', '--playlist-end', String(limit),
    '--print', '%(id)s\t%(title)s\t%(webpage_url)s',
    channelUrl,
  ], 60000);
  const videos: DiscoveredVideo[] = [];
  for (const line of out.split('\n')) {
    const [id, title, url] = line.split('\t');
    if (id && url) videos.push({ id: id.trim(), title: (title || '').trim(), url: url.trim() });
  }
  return videos;
}

function extractJson(text: string): any | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
}

// Mesmo prompt do pipeline manual (cortesPipeline.ts no frontend), mas com
// teto de cortes = vagas restantes no dia, pra não gerar mais do que cabe.
async function selectHighlights(transcript: string, durationSec: number, maxClips: number): Promise<{ start: string; end: string; title: string }[]> {
  const prompt = `Você recebe a transcrição SRT de um vídeo de ${Math.round(durationSec / 60)} minutos.
Identifique os melhores momentos que valem virar cortes virais (30-90s cada): ganchos fortes, histórias completas, frases de impacto, momentos engraçados/polêmicos. Escolha até ${maxClips} corte(s), do jeito que fizer mais sentido — pode ser menos se o vídeo não render tantos.
Responda SOMENTE com JSON:
{ "segments": [ { "start": "HH:MM:SS", "end": "HH:MM:SS", "title": "legenda curta e chamativa" } ] }
Use os timestamps reais do SRT. Não repita trechos sobrepostos.

SRT:
${transcript.slice(0, 90000)}`;

  const model = process.env.AI_MODEL || 'big-pickle';
  const result = await executeCapability('ai.complete', {
    messages: [{ role: 'user', content: prompt }],
    model,
  }) as { outputs?: { content?: string } };
  const raw = result?.outputs?.content ?? '';
  const parsed = extractJson(raw);
  return Array.isArray(parsed?.segments) ? parsed.segments.slice(0, maxClips) : [];
}

interface Target { platform: 'youtube' | 'instagram' | 'facebook' | 'tiktok'; accountId: string }

// Resolve as contas-alvo do piloto (cadastradas em Settings → Conexões,
// qualquer combinação de redes) a partir dos ids salvos no piloto.
async function resolveTargets(accountIds: string[]): Promise<Target[]> {
  const targets: Target[] = [];
  for (const id of accountIds) {
    const acc = await getAccount(id);
    if (acc && ['youtube', 'instagram', 'facebook', 'tiktok'].includes(acc.platform)) {
      targets.push({ platform: acc.platform as Target['platform'], accountId: acc.id });
    }
  }
  return targets;
}

function parseTimes(times?: string): [number, number][] {
  const matches = (times || '').match(/\d{1,2}:\d{2}/g) || [];
  return matches.map((t) => t.split(':').map(Number) as [number, number]).filter(([h, m]) => h >= 0 && h < 24 && m >= 0 && m < 60);
}
function defaultTimes(n: number): [number, number][] {
  const start = 9, end = 21;
  if (n <= 1) return [[12, 0]];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => [Math.round(start + i * step), 0] as [number, number]);
}

// Calcula os horários dos próximos `count` posts, começando depois dos que já
// foram agendados hoje (offset), espalhados pelos horários do piloto (ou
// automático entre 9h-21h). Igual à lógica do frontend (services/scheduler.ts).
function nextSlotTimes(count: number, offsetToday: number, pilot: ClipPilot): number[] {
  let slots = parseTimes(pilot.times);
  if (slots.length === 0) slots = defaultTimes(Math.max(1, pilot.postsPerDay || 1));
  const out: number[] = [];
  const now = new Date();
  let idx = offsetToday % slots.length;
  let dayOffset = Math.floor(offsetToday / slots.length);
  let guard = 0;
  while (out.length < count && guard < 1000) {
    guard++;
    const base = new Date(now);
    base.setDate(base.getDate() + dayOffset);
    const [h, m] = slots[idx];
    base.setHours(h, m, 0, 0);
    if (base.getTime() > now.getTime()) out.push(base.getTime());
    idx++;
    if (idx >= slots.length) { idx = 0; dayOffset++; }
  }
  return out;
}

let ticking = false;
const rotateByPilot = new Map<string, number>();

// Processa UM piloto: acha vídeo novo, corta e agenda (se ainda tiver vaga
// no dia). Erros de um piloto não afetam os outros.
async function runPilot(pilot: ClipPilot): Promise<void> {
  const origin = `autoclip:${pilot.id}`;
  const alreadyToday = await countPostsTodayByOrigin(origin);
  const remaining = pilot.postsPerDay - alreadyToday;
  if (remaining <= 0) return;

  const channels = (await listClipChannels(pilot.id)).filter((c) => c.active);
  if (channels.length === 0) return;

  const rotate = rotateByPilot.get(pilot.id) ?? 0;
  let found: { video: DiscoveredVideo; channelUrl: string } | null = null;
  for (let i = 0; i < channels.length && !found; i++) {
    const ch = channels[(rotate + i) % channels.length];
    const videos = await discoverChannelVideos(ch.channelUrl, 15);
    for (const v of videos) {
      if (!(await isVideoProcessed(v.id))) { found = { video: v, channelUrl: ch.channelUrl }; break; }
    }
  }
  rotateByPilot.set(pilot.id, rotate + 1);
  if (!found) return;

  const { video, channelUrl } = found;
  const runId = `autoclip/${pilot.id}/${Date.now()}`;
  try {
    const fetchRes = await runYtFetch({ type: 'ytFetch', payload: { url: video.url }, cwd: runId } as JobRequest, noop);
    const data = fetchRes.result as any;
    if (!data?.hasSubs || !data?.transcript) {
      await addClipHistory({ videoId: video.id, pilotId: pilot.id, channelUrl, title: video.title, status: 'skipped', clipsGenerated: 0, error: 'sem legenda/transcrição', processedAt: Date.now() });
      return;
    }

    const duration = Number(data.duration) || 0;
    const byDuration = Math.max(1, Math.round((duration || 600) / 210));
    const maxClips = Math.max(1, Math.min(remaining, byDuration));

    const segments = await selectHighlights(String(data.transcript), duration, maxClips);
    if (segments.length === 0) {
      await addClipHistory({ videoId: video.id, pilotId: pilot.id, channelUrl, title: video.title, status: 'error', clipsGenerated: 0, error: 'IA não achou momentos bons', processedAt: Date.now() });
      return;
    }

    const clipRes = await runClip({ type: 'clip', payload: { input: data.video, srt: data.srt, segments, vertical: true }, cwd: runId } as JobRequest, noop);
    const clips = ((clipRes.result as any)?.clips ?? []) as { file: string; title?: string }[];
    if (clips.length === 0) {
      await addClipHistory({ videoId: video.id, pilotId: pilot.id, channelUrl, title: video.title, status: 'error', clipsGenerated: 0, error: 'nenhum corte gerado', processedAt: Date.now() });
      return;
    }

    const targets = await resolveTargets(pilot.accountIds);
    if (targets.length === 0) {
      await addClipHistory({ videoId: video.id, pilotId: pilot.id, channelUrl, title: video.title, status: 'error', clipsGenerated: 0, error: 'nenhuma conta selecionada pro piloto (edite o piloto e escolha as contas)', processedAt: Date.now() });
      return;
    }

    const slots = nextSlotTimes(clips.length, alreadyToday, pilot);
    const tags = (pilot.niche || '').split(/[\s,]+/).filter(Boolean).slice(0, 10);
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      for (const t of targets) {
        await addPost({
          platform: t.platform,
          file: `${runId}/${c.file}`,
          title: c.title || video.title || `Corte ${i + 1}`,
          description: pilot.description || '',
          tags,
          at: slots[i] ?? Date.now(),
          accountId: t.accountId,
          origin,
        });
      }
    }

    await addClipHistory({ videoId: video.id, pilotId: pilot.id, channelUrl, title: video.title, status: 'done', clipsGenerated: clips.length, processedAt: Date.now() });
  } catch (e) {
    await addClipHistory({ videoId: video.id, pilotId: pilot.id, channelUrl, title: video.title, status: 'error', clipsGenerated: 0, error: e instanceof Error ? e.message : String(e), processedAt: Date.now() });
  }
}

export async function autoclipTick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    const pilots = (await listPilots()).filter((p) => p.active);
    for (const pilot of pilots) {
      try {
        await runPilot(pilot);
      } catch (e) {
        console.error(`[autoclip] piloto ${pilot.name} falhou:`, e instanceof Error ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[autoclip] tick falhou:', e instanceof Error ? e.message : e);
  } finally {
    ticking = false;
  }
}

// Roda só um piloto específico agora (botão "Rodar agora" de um piloto).
export async function runPilotNow(pilotId: string): Promise<void> {
  const pilots = await listPilots();
  const pilot = pilots.find((p) => p.id === pilotId);
  if (!pilot) throw new Error('piloto não encontrado');
  await runPilot(pilot);
}
