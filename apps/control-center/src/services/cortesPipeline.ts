// Pipeline de Cortes (Fase 4). Orquestra: baixar vídeo + transcrição (worker) →
// IA escolhe TODOS os melhores momentos (quantidade proporcional à duração) →
// cortar em vertical com legendas sincronizadas (worker) → links dos clipes.
import { askBeeHive } from './beehiveApi';
import { runWorkerJob, getWorkerConfig, isWorkerConfigured } from './worker';

export interface CorteClip {
  file: string;
  title?: string;
  start: number;
  end: number;
  url: string; // link de download no worker
}

function extractJson(text: string): any | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
}

export async function generateCortes(input: {
  url: string;
  count?: number; // ignorado — a quantidade é decidida pela duração
  onProgress?: (msg: string) => void;
}): Promise<{ clips: CorteClip[]; error?: string }> {
  if (!isWorkerConfigured()) return { clips: [], error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const prog = input.onProgress ?? (() => {});
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) return { clips: [], error: 'Cole um link válido (YouTube, etc).' };

  // 1) baixar vídeo + transcrição
  prog('Baixando vídeo e transcrição...');
  const fetchRes = await runWorkerJob({ type: 'ytFetch', payload: { url } }, { timeoutMs: 900000 });
  if (fetchRes.status !== 'done') {
    return { clips: [], error: `Falha ao baixar: ${fetchRes.error || fetchRes.output || 'erro'}` };
  }
  const data = fetchRes.result as any;
  if (!data?.hasSubs || !data?.transcript) {
    return { clips: [], error: 'Esse vídeo não tem legenda/transcrição — não dá pra achar os melhores momentos automaticamente. Escolha um vídeo com legendas (a maioria do YouTube tem).' };
  }

  // quantidade de cortes proporcional à duração (~1 a cada 3,5 min), entre 3 e 30
  const duration = Number(data.duration) || 0;
  const maxClips = Math.max(3, Math.min(30, Math.round((duration || 600) / 210)));

  // 2) IA escolhe os melhores momentos a partir do SRT
  prog(`Analisando ${Math.round(duration / 60)} min e escolhendo os melhores momentos...`);
  const segPrompt = `Você recebe a transcrição SRT de um vídeo de ${Math.round(duration / 60)} minutos.
Identifique TODOS os momentos que valem virar cortes virais (30-90s cada): ganchos fortes, histórias completas, frases de impacto, momentos engraçados/polêmicos. Escolha quantos o vídeo comportar (normalmente 1 a cada 3-5 min), NÃO force um número fixo — use até ${maxClips} cortes.
Responda SOMENTE com JSON:
{ "segments": [ { "start": "HH:MM:SS", "end": "HH:MM:SS", "title": "legenda curta e chamativa" } ] }
Use os timestamps reais do SRT. Não repita trechos sobrepostos.

SRT:
${String(data.transcript).slice(0, 90000)}`;

  let segments: any[] = [];
  try {
    const raw = await askBeeHive(segPrompt);
    const parsed = extractJson(raw);
    segments = Array.isArray(parsed?.segments) ? parsed.segments.slice(0, maxClips) : [];
  } catch { /* vazio abaixo */ }
  if (segments.length === 0) return { clips: [], error: 'Não consegui identificar bons momentos na transcrição.' };

  // 3) cortar em vertical com legendas no worker
  prog(`Cortando ${segments.length} trecho(s) em vertical com legenda...`);
  const clipRes = await runWorkerJob(
    { type: 'clip', payload: { input: data.video, srt: data.srt, segments, vertical: true } },
    { timeoutMs: 900000 },
  );
  if (clipRes.status !== 'done') {
    return { clips: [], error: `Falha ao cortar: ${clipRes.error || clipRes.output || 'erro'}` };
  }
  const out = clipRes.result as any;
  const { url: workerUrl, token } = getWorkerConfig();
  const clips: CorteClip[] = (out?.clips || []).map((c: any) => ({
    file: c.file,
    title: c.title,
    start: c.start,
    end: c.end,
    url: `${workerUrl}/files/${c.file}?t=${encodeURIComponent(token)}`,
  }));
  prog(`Pronto: ${clips.length} corte(s).`);
  return { clips };
}
