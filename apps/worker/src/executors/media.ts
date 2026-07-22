// Executor de mídia (Cortes): baixar vídeo + transcrição (ytFetch) e cortar
// trechos em vertical com legendas sincronizadas (clip). Usa yt-dlp e ffmpeg.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

type Chunk = (kind: 'stdout' | 'stderr', data: string) => void;

function run(cmd: string, args: string[], cwd: string, onChunk: Chunk, timeoutMs = 900000): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: process.env });
    let killed = false;
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', (d) => onChunk('stdout', d.toString()));
    child.stderr.on('data', (d) => onChunk('stderr', d.toString()));
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => { clearTimeout(timer); if (killed) return reject(new Error(`timeout em ${cmd}`)); resolve(code ?? 0); });
  });
}

// Baixa o vídeo (mp4) e a transcrição (auto-subs → srt), devolve caminhos + transcript.
export async function runYtFetch(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const url = String(req.payload.url ?? '').trim();
  if (!url) throw new Error('ytFetch: payload.url é obrigatório');
  if (!/^https?:\/\//i.test(url)) throw new Error('ytFetch: url inválida');

  const dir = resolveInWorkspace(req.cwd ?? '.');
  await fsp.mkdir(dir, { recursive: true });

  onChunk('stdout', '→ Baixando vídeo e legendas...\n');
  const code = await run('yt-dlp', [
    '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '--merge-output-format', 'mp4',
    '-o', 'source.%(ext)s',
    '--write-auto-subs', '--write-subs',
    '--sub-langs', 'pt.*,en.*,pt-BR',
    '--convert-subs', 'srt',
    '--no-playlist',
    url,
  ], dir, onChunk);
  if (code !== 0) throw new Error(`yt-dlp falhou (code ${code})`);

  const files = await fsp.readdir(dir);
  const video = files.find((f) => f === 'source.mp4') || files.find((f) => f.startsWith('source.') && /\.(mp4|mkv|webm)$/.test(f));
  if (!video) throw new Error('ytFetch: vídeo não encontrado após download');

  let duration = 0;
  try {
    let out = '';
    await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', video], dir, (k, d) => { if (k === 'stdout') out += d; });
    duration = Math.round(parseFloat(out.trim()) || 0);
  } catch { /* ignore */ }

  const srt = files.find((f) => f.endsWith('.srt'));
  let transcript = '';
  if (srt) {
    transcript = await fsp.readFile(path.join(dir, srt), 'utf8').catch(() => '');
    if (transcript.length > 120000) transcript = transcript.slice(0, 120000);
  }

  onChunk('stdout', `✓ Vídeo: ${video} (${duration}s) · legenda: ${srt ? 'sim' : 'não'}\n`);
  return { result: { video, srt: srt || null, duration, hasSubs: !!srt, transcript } };
}

function toSeconds(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function escDraw(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');
}

// --- SRT: parse e recorte por janela, com timestamps reajustados para 0 ---
interface Cue { start: number; end: number; text: string; }

function parseSrtTime(t: string): number {
  const m = t.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
}
function fmtSrtTime(sec: number): string {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${p(h)}:${p(mm)}:${p(ss)},${p(ms, 3)}`;
}
function parseSrt(content: string): Cue[] {
  const blocks = content.replace(/\r/g, '').split(/\n\n+/);
  const cues: Cue[] = [];
  for (const b of blocks) {
    const lines = b.split('\n').filter((l) => l.trim() !== '');
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;
    const [a, bb] = timeLine.split('-->');
    const start = parseSrtTime(a);
    const end = parseSrtTime(bb);
    const text = lines.slice(lines.indexOf(timeLine) + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text && end > start) cues.push({ start, end, text });
  }
  return cues;
}
// gera um SRT recortado à janela [ws, we], com tempos relativos a ws
function sliceSrt(cues: Cue[], ws: number, we: number): string {
  let idx = 1;
  const out: string[] = [];
  for (const c of cues) {
    if (c.end <= ws || c.start >= we) continue;
    const s = Math.max(0, c.start - ws);
    const e = Math.min(we - ws, c.end - ws);
    if (e <= s) continue;
    out.push(String(idx++), `${fmtSrtTime(s)} --> ${fmtSrtTime(e)}`, c.text, '');
  }
  return out.join('\n');
}

// estilo das legendas (TikTok-like): grande, contorno forte, centro-baixo
const SUB_STYLE = "FontName=DejaVu Sans,Fontsize=22,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=170";

// Corta segmentos em vertical 1080x1920 com legendas sincronizadas.
export async function runClip(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const input = String(req.payload.input ?? 'source.mp4').trim();
  const vertical = req.payload.vertical !== false;
  const segments = Array.isArray(req.payload.segments) ? (req.payload.segments as any[]) : [];
  if (segments.length === 0) throw new Error('clip: payload.segments vazio');

  const dir = resolveInWorkspace(req.cwd ?? '.');
  const abs = path.join(dir, input);
  if (!fs.existsSync(abs)) throw new Error(`clip: arquivo de entrada não encontrado: ${input}`);

  // carrega SRT (informado ou primeiro .srt do diretório) para legendas sincronizadas
  let cues: Cue[] = [];
  try {
    const srtName = req.payload.srt ? String(req.payload.srt) : (await fsp.readdir(dir)).find((f) => f.endsWith('.srt'));
    if (srtName && fs.existsSync(path.join(dir, srtName))) {
      cues = parseSrt(await fsp.readFile(path.join(dir, srtName), 'utf8'));
    }
  } catch { /* sem legendas */ }

  const crop = vertical ? 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920' : 'scale=1080:-2';
  const outputs: { file: string; title?: string; start: number; end: number }[] = [];

  for (let i = 0; i < Math.min(segments.length, 40); i++) {
    const seg = segments[i] || {};
    const start = toSeconds(seg.start);
    const end = toSeconds(seg.end);
    if (!(end > start)) continue;
    const out = `clip_${i + 1}.mp4`;
    const title = seg.title ? String(seg.title) : '';

    let vf = crop;
    // legendas sincronizadas se houver transcrição para a janela
    let subFile = '';
    if (cues.length) {
      const slice = sliceSrt(cues, start, end);
      if (slice.trim()) {
        subFile = `clip_${i + 1}.srt`;
        await fsp.writeFile(path.join(dir, subFile), slice, 'utf8');
        vf += `,subtitles=${subFile}:force_style='${SUB_STYLE}'`;
      }
    }
    // sem legendas → queima o título como fallback
    if (!subFile && title) {
      vf += `,drawtext=text='${escDraw(title.slice(0, 90))}':fontcolor=white:fontsize=46:box=1:boxcolor=black@0.5:boxborderw=14:x=(w-text_w)/2:y=h-260`;
    }

    onChunk('stdout', `→ Corte ${i + 1}: ${start}s–${end}s${subFile ? ' (com legenda)' : ''}\n`);
    const code = await run('ffmpeg', [
      '-y', '-ss', String(start), '-to', String(end), '-i', input,
      '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out,
    ], dir, onChunk);
    if (code === 0 && fs.existsSync(path.join(dir, out))) {
      outputs.push({ file: out, title: title || undefined, start, end });
    }
  }

  if (outputs.length === 0) throw new Error('clip: nenhum corte gerado');
  onChunk('stdout', `✓ ${outputs.length} corte(s) gerado(s)\n`);
  return { result: { clips: outputs } };
}
