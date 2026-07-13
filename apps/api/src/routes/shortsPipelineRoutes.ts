import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';
import type { RuntimeManager } from '@beehive/platform/runtime';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

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

const PIPELINE_DIR = join(__dirname, '..', '..', '..', '..', 'pipeline');

export function mountShortsPipelineRoutes(app: Express, db: DatabaseManager, runtime?: RuntimeManager): void {

  // ─── LLM endpoint pro Python pipeline ────────────────────

  // POST /api/shorts/pipeline/llm
  app.post('/api/shorts/pipeline/llm', async (req, res) => {
    try {
      const { prompt, providerId } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'prompt é obrigatório' });
        return;
      }

      // Usa o RuntimeManager pra chamar o LLM
      let content = '';
      if (runtime) {
        const result = await runtime.context.kernel.dispatch<{ content: string }>({
          type: 'ai.chat',
          payload: {
            messages: [{ role: 'user', content: prompt }],
            options: providerId ? { providerId } : {},
          },
        });
        content = result?.content ?? '';
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
      const { agentId, youtubeUrl, numClips, providerId, language } = req.body;

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
        `INSERT INTO shorts_pipeline_jobs (id, agent_id, youtube_url, status, progress, num_clips, provider_id, language, error_message, started_at, completed_at, created_at)
         VALUES (?, ?, ?, 'queued', 0, ?, ?, ?, '', '', '', ?)`,
        [id, agentId, youtubeUrl, numClips ?? 3, providerId ?? '', language ?? 'pt', ts],
      );

      // Spawn Python pipeline como subprocess
      const pythonScript = join(PIPELINE_DIR, 'run.py');
      const input = JSON.stringify({
        youtubeUrl,
        agentId,
        numClips: numClips ?? 3,
        providerId: providerId ?? '',
        language: language ?? 'pt',
      });

      const child = spawn('python', [pythonScript], {
        cwd: PIPELINE_DIR,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.stdin.write(input);
      child.stdin.end();

      child.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const update = JSON.parse(line);
            if (update.type === 'progress') {
              _updateJob(db, id, update.status, update.progress);
            } else if (update.type === 'result') {
              _saveResults(db, id, agentId, update);
              _updateJob(db, id, 'done', 100);
            } else if (update.type === 'error') {
              _updateJobError(db, id, update.error);
            }
          } catch {
            // ignore parse errors from stdout
          }
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        console.error(`[shorts-pipeline] stderr: ${data.toString().slice(0, 500)}`);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          _updateJobError(db, id, `Pipeline exited with code ${code}`);
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
    clipPath: row.clip_path,
    thumbnailPath: row.thumbnail_path,
    subtitlePath: row.subtitle_path,
    duration: row.duration,
    status: row.status,
    createdAt: row.created_at,
  };
}
