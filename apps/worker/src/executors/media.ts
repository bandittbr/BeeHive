// Executor de mídia (Cortes): baixar vídeo + transcrição (ytFetch) e cortar
// trechos em vertical com legenda opcional (clip). Usa yt-dlp e ffmpeg.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.js';
import type { JobRequest } from '../types.js';

type Chunk = (kind: 'stdout' | 'stderr', data: string) => void;

function run(cmd: string, args: string[], cwd: string, onChunk: Chunk, timeoutMs = 600000): Promise<number> {
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
  // Baixa vídeo (<=1080p) e tenta subs/auto-subs em pt/en, convertendo para srt
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

  // duração via ffprobe
  let duration = 0;
  try {
    let out = '';
    await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', video], dir, (k, d) => { if (k === 'stdout') out += d; });
    duration = Math.round(parseFloat(out.trim()) || 0);
  } catch { /* ignore */ }

  // transcript (primeiro srt encontrado)
  const srt = files.find((f) => f.endsWith('.srt'));
  let transcript = '';
  if (srt) {
    transcript = await fsp.readFile(path.join(dir, srt), 'utf8').catch(() => '');
    if (transcript.length > 60000) transcript = transcript.slice(0, 60000);
  }

  onChunk('stdout', `✓ Vídeo: ${video} (${duration}s) · legenda: ${srt ? 'sim' : 'não'}\n`);
  return { result: { video, duration, hasSubs: !!srt, transcript } };
}

function toSeconds(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// escapa texto para o filtro drawtext do ffmpeg
function escDraw(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');
}

// Corta segmentos em vertical 1080x1920, com título opcional queimado embaixo.
export async function runClip(req: JobRequest, onChunk: Chunk): Promise<{ result: unknown }> {
  const input = String(req.payload.input ?? 'source.mp4').trim();
  const vertical = req.payload.vertical !== false;
  const segments = Array.isArray(req.payload.segments) ? (req.payload.segments as any[]) : [];
  if (segments.length === 0) throw new Error('clip: payload.segments vazio');

  const dir = resolveInWorkspace(req.cwd ?? '.');
  const abs = path.join(dir, input);
  if (!fs.existsSync(abs)) throw new Error(`clip: arquivo de entrada não encontrado: ${input}`);

  const outputs: { file: string; title?: string; start: number; end: number }[] = [];

  for (let i = 0; i < Math.min(segments.length, 10); i++) {
    const seg = segments[i] || {};
    const start = toSeconds(seg.start);
    const end = toSeconds(seg.end);
    if (!(end > start)) continue;
    const out = `clip_${i + 1}.mp4`;
    const title = seg.title ? String(seg.title) : '';

    let vf = vertical
      ? 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
      : 'scale=1080:-2';
    if (title) {
      const t = escDraw(title.slice(0, 90));
      vf += `,drawtext=text='${t}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=12:x=(w-text_w)/2:y=h-260:line_spacing=8`;
    }

    onChunk('stdout', `→ Corte ${i + 1}: ${start}s–${end}s\n`);
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
