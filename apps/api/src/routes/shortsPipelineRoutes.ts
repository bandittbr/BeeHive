import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';
import type { RuntimeManager } from '@beehive/platform/runtime';
import { spawn, execSync } from 'node:child_process';
import { dirname, join, delimiter, resolve } from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from '../config';
import { createOpenAIProvider } from '../intelligence/openaiProvider';
import { isFreeZenModel } from './shortsAgentRoutes';

/**
 * Rotas do pipeline de Cortes Youtube.
 * Gerencia jobs, status, resultados e o endpoint LLM pro Python pipeline.
 */

function generateId(): string {
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

const PIPELINE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'pipeline');

// Resolve o interpretador Python disponível (Railway nixpacks costuma expor `python3`).
let RESOLVED_PYTHON = 'python';
for (const candidate of ['python3', 'python', 'python3.11']) {
  try {
    execSync(`${candidate} --version`, { stdio: 'ignore' });
    RESOLVED_PYTHON = candidate;
    break;
  } catch {
    // tenta o próximo
  }
}

// faster-whisper (ctranslate2/onnxruntime) precisa de libstdc++ em runtime.
// O ambiente nix não a deixa no LD_LIBRARY_PATH por padrão. Mas há várias
// versões de libstdc++ no /nix/store; precisamos da que expõe CXXABI_1.3.15
// (a que o ffmpeg e seus pacotes esperam), senão quebramos o ffmpeg.
function _findLibstdcxxDir(): string {
  try {
    // Preferir a libstdc++ que o próprio ffmpeg usa (via ldd): garante que
    // ffmpeg e o faster-whisper compartilham a MESMA lib (sem conflito de ABI).
    const ldd = execSync(
      "ldd $(command -v ffmpeg) 2>/dev/null | grep -oE '/nix/store/[^ ]*libstdc\\+\\+.so[^ ]*' | head -1",
      { stdio: ['ignore', 'pipe', 'ignore'] },
    ).toString().trim();
    if (ldd && ldd.includes('/')) {
      return ldd.slice(0, ldd.lastIndexOf('/'));
    }
  } catch {
    // ignora e tenta o fallback abaixo
  }
  try {
    const cmd = `for f in $(find /nix/store -name 'libstdc++.so*' 2>/dev/null); do if grep -aq 'CXXABI_1.3.15' "$f" 2>/dev/null; then dirname "$f"; break; fi; done`;
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || '';
  } catch {
    return '';
  }
}

const _LIBSTDCXX_DIR = _findLibstdcxxDir();
function _ldLibraryPath(): string {
  const base = process.env.LD_LIBRARY_PATH ?? '';
  return _LIBSTDCXX_DIR ? `${_LIBSTDCXX_DIR}:${base}` : base;
}

export function mountShortsPipelineRoutes(app: Express, db: DatabaseManager, runtime?: RuntimeManager): void {

  // ─── LLM endpoint pro Python pipeline ────────────────────

  // POST /api/shorts/pipeline/llm
  app.post('/api/shorts/pipeline/llm', async (req, res) => {
    try {
      const { prompt, providerId, model } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'prompt é obrigatório' });
        return;
      }

      // Usa o RuntimeManager pra chamar o LLM
      let content = '';
      if (runtime) {
        // Modelo grátis do OpenCode Zen (big-pickle, hy3-free, etc.) — sem chave
        if (model && isFreeZenModel(model)) {
          try {
            const zenProvider = createOpenAIProvider({
              apiKey: '',
              baseUrl: config.opencode?.baseUrl ?? 'https://opencode.ai/zen/v1',
              model,
            });
            content = await zenProvider.chat([{ role: 'user', content: prompt }]);
          } catch (err) {
            console.error('[shorts] Erro no modelo free, caindo no fallback:', err);
          }
        }

        if (!content) {
          const result = await runtime.context.kernel.dispatch<{ content: string }>({
            type: 'ai.chat',
            payload: {
              messages: [{ role: 'user', content: prompt }],
              options: providerId ? { providerId } : {},
            },
          });
          content = result?.content ?? '';
        }
      } else {
        // Fallback: chama o provider OpenAI diretamente
        const { createOpenAIProvider } = await import('../intelligence/openaiProvider');
        const provider = createOpenAIProvider();
        const messages = [{ role: 'user' as const, content: prompt }];
        const stream = provider.chatStream(messages);
        let text = '';
        for await (const chunk of stream) {
          text += chunk;
        }
        content = text;
      }

      res.json({ content });
    } catch (err) {
      console.error('[shorts] Erro no LLM:', err);
      res.status(500).json({ error: 'Erro ao chamar LLM' });
    }
  });

  // ─── Pipeline Jobs ───────────────────────────────────────

  // POST /api/shorts/pipeline — iniciar job
  app.post('/api/shorts/pipeline', (req, res) => {
    try {
      const { agentId, youtubeUrl, numClips, providerId, language, model } = req.body;

      if (!youtubeUrl || typeof youtubeUrl !== 'string') {
        res.status(400).json({ error: 'youtubeUrl é obrigatório' });
        return;
      }
      if (!agentId || typeof agentId !== 'string') {
        res.status(400).json({ error: 'agentId é obrigatório' });
        return;
      }

      const id = generateId();
      const ts = now();

      db.execute(
        `INSERT INTO shorts_pipeline_jobs (id, agent_id, youtube_url, status, progress, num_clips, provider_id, model, language, error_message, started_at, completed_at, created_at)
         VALUES (?, ?, ?, 'queued', 0, ?, ?, ?, ?, '', '', '', ?)`,
        [id, agentId, youtubeUrl, numClips ?? 3, providerId ?? '', model ?? '', language ?? 'pt', ts],
      );

      // Spawn Python pipeline como subprocess
      const pythonScript = join(PIPELINE_DIR, 'run.py');
      const input = JSON.stringify({
        youtubeUrl,
        agentId,
        numClips: numClips ?? 3,
        providerId: providerId ?? '',
        model: model ?? '',
        language: language ?? 'pt',
      });

      const child = spawn(RESOLVED_PYTHON, [pythonScript], {
        cwd: PIPELINE_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // O pipeline roda no mesmo container e chama de volta a API de IA.
          // Aponta para a porta real em que o Node está ouvindo.
          BEEHIVE_API_URL: `http://localhost:${config.port}`,
          PYTHONPATH: PIPELINE_DIR + (process.env.PYTHONPATH ? delimiter + process.env.PYTHONPATH : ''),
          LD_LIBRARY_PATH: _ldLibraryPath(),
          DEBUG: '1',
          // HuggingFace passou a usar o cliente Xet (CAS) p/ baixar modelos grandes;
          // ele falha com 401 no Railway. Desliga e usa o download LFS tradicional.
          HF_HUB_DISABLE_XET: '1',
          HF_HUB_DISABLE_TELEMETRY: '1',
        },
      });

      child.stdin.write(input);
      child.stdin.end();

      let stderrBuf = '';
      child.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const update = JSON.parse(line);
            if (update.type === 'progress') {
              _updateJob(db, id, update.status, update.progress);
            } else if (update.type === 'result') {
              const errors: string[] = update.errors ?? [];
              if (errors.length > 0 && (!update.clips || update.clips.length === 0)) {
                _updateJobError(db, id, `Pipeline: ${errors.join(' | ')}`);
              } else {
                _saveResults(db, id, agentId, update);
                _updateJob(db, id, 'done', 100);
              }
            } else if (update.type === 'error') {
              _updateJobError(db, id, update.error);
            }
          } catch {
            // ignore parse errors from stdout
          }
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        stderrBuf += text;
        console.error(`[shorts-pipeline] stderr: ${text.slice(0, 500)}`);
      });

      child.on('close', (code, signal) => {
        if (code !== 0) {
          const sig = signal ? ` signal=${signal}` : '';
          _updateJobError(db, id, `Pipeline exited (code=${code}${sig}): ${stderrBuf.slice(-800)}`);
        }
      });

      child.on('error', (err) => {
        _updateJobError(db, id, `Failed to start pipeline: ${err.message}`);
      });

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_pipeline_jobs WHERE id = ?', [id]);
      res.status(201).json(mapJob(row!));
    } catch (err) {
      console.error('[shorts] Erro ao criar job:', err);
      res.status(500).json({ error: 'Erro ao criar job' });
    }
  });

  // GET /api/shorts/pipeline/:id — status do job
  app.get('/api/shorts/pipeline/:id', (req, res) => {
    try {
      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_pipeline_jobs WHERE id = ?', [req.params.id]);
      if (!row) {
        res.status(404).json({ error: 'Job não encontrado' });
        return;
      }

      const clips = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_pipeline_clips WHERE job_id = ? ORDER BY score DESC',
        [req.params.id],
      );

      res.json({
        ...mapJob(row),
        clips: clips.map(mapClip),
      });
    } catch (err) {
      console.error('[shorts] Erro ao buscar job:', err);
      res.status(500).json({ error: 'Erro ao buscar job' });
    }
  });

  // GET /api/shorts/pipeline/:id/clips — clips do job
  app.get('/api/shorts/pipeline/:id/clips', (req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_pipeline_clips WHERE job_id = ? ORDER BY score DESC',
        [req.params.id],
      );
      res.json(rows.map(mapClip));
    } catch (err) {
      console.error('[shorts] Erro ao listar clips:', err);
      res.status(500).json({ error: 'Erro ao listar clips' });
    }
  });

  // GET /api/shorts/clips/* — serve arquivos de clip gerados (output/<agentId>/...)
  // O Python roda com cwd=PIPELINE_DIR, então os clips ficam em PIPELINE_DIR/output/...
  app.get('/api/shorts/clips/*', (req, res) => {
    try {
      const rel = decodeURIComponent(req.params[0] ?? '');
      const full = resolve(PIPELINE_DIR, rel);
      if (!full.startsWith(PIPELINE_DIR)) {
        res.status(400).json({ error: 'Caminho inválido' });
        return;
      }
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
        res.status(404).json({ error: 'Clip não encontrado' });
        return;
      }
      const stat = fs.statSync(full);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      fs.createReadStream(full).pipe(res);
    } catch (err) {
      console.error('[shorts] Erro ao servir clip:', err);
      res.status(500).json({ error: 'Erro ao servir clip' });
    }
  });

  // DELETE /api/shorts/pipeline/:id — cancelar job
  app.delete('/api/shorts/pipeline/:id', (req, res) => {
    try {
      db.execute('UPDATE shorts_pipeline_jobs SET status = ? WHERE id = ? AND status NOT IN (?, ?)',
        ['error', req.params.id, 'done', 'error']);
      res.json({ success: true });
    } catch (err) {
      console.error('[shorts] Erro ao cancelar job:', err);
      res.status(500).json({ error: 'Erro ao cancelar job' });
    }
  });

  // GET /api/shorts/pipeline/agent/:agentId — jobs de um agent
  app.get('/api/shorts/pipeline/agent/:agentId', (req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_pipeline_jobs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.params.agentId],
      );
      res.json(rows.map(mapJob));
    } catch (err) {
      console.error('[shorts] Erro ao listar jobs:', err);
      res.status(500).json({ error: 'Erro ao listar jobs' });
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────

function _updateJob(db: DatabaseManager, id: string, status: string, progress: number): void {
  const updates = ['status = ?', 'progress = ?'];
  const params: unknown[] = [status, progress];

  if (status === 'downloading' || status === 'transcribing') {
    updates.push('started_at = ?');
    params.push(now());
  }
  if (status === 'done' || status === 'error') {
    updates.push('completed_at = ?');
    params.push(now());
  }

  params.push(id);
  db.execute(`UPDATE shorts_pipeline_jobs SET ${updates.join(', ')} WHERE id = ?`, params);
}

function _updateJobError(db: DatabaseManager, id: string, errorMsg: string): void {
  db.execute(
    "UPDATE shorts_pipeline_jobs SET status = 'error', error_message = ?, completed_at = ? WHERE id = ?",
    [errorMsg, now(), id],
  );
}

function _saveResults(db: DatabaseManager, jobId: string, agentId: string, result: any): void {
  const clips = result.clips || [];
  for (const clip of clips) {
    const clipId = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.execute(
      `INSERT INTO shorts_pipeline_clips
       (id, job_id, agent_id, title, description, hashtags, start_time, end_time, score, hook_sentence, virality_reason, clip_path, thumbnail_path, subtitle_path, duration, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?)`,
      [
        clipId, jobId, agentId,
        clip.title ?? '', clip.description ?? '',
        JSON.stringify(clip.hashtags ?? []),
        clip.start_time ?? 0, clip.end_time ?? 0,
        clip.score ?? 0, clip.hook_sentence ?? '', clip.virality_reason ?? '',
        clip.path ?? '', clip.thumbnail_path ?? '', clip.subtitle_path ?? '',
        clip.duration ?? 0, now(),
      ],
    );
  }
}

function mapJob(row: Record<string, unknown>) {
  return {
    id: row.id,
    agentId: row.agent_id,
    youtubeUrl: row.youtube_url,
    status: row.status,
    progress: row.progress,
    numClips: row.num_clips,
    providerId: row.provider_id,
    model: row.model ?? '',
    language: row.language,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function mapClip(row: Record<string, unknown>) {
  return {
    id: row.id,
    jobId: row.job_id,
    agentId: row.agent_id,
    title: row.title,
    description: row.description,
    hashtags: JSON.parse((row.hashtags as string) ?? '[]'),
    startTime: row.start_time,
    endTime: row.end_time,
    score: row.score,
    hookSentence: row.hook_sentence,
    viralityReason: row.virality_reason,
    clipPath: row.clip_path ? `/shorts/clips/${String(row.clip_path).replace(/^\/+/, '')}` : '',
    thumbnailPath: row.thumbnail_path ? `/shorts/clips/${String(row.thumbnail_path).replace(/^\/+/, '')}` : '',
    subtitlePath: row.subtitle_path ? `/shorts/clips/${String(row.subtitle_path).replace(/^\/+/, '')}` : '',
    duration: row.duration,
    status: row.status,
    createdAt: row.created_at,
  };
}
