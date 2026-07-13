import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';

/**
 * Rotas de publicação e métricas do módulo Cortes Youtube.
 */

function generateId(): string {
  return `spm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function mountShortsPublishRoutes(app: Express, db: DatabaseManager): void {

  // ─── Publish Queue ───────────────────────────────────────

  // POST /api/shorts/publish/clip/:clipId — publicar um clip
  app.post('/api/shorts/publish/clip/:clipId', (req, res) => {
    try {
      const { clipId } = req.params;
      const { platform } = req.body;

      const clip = db.queryOne<Record<string, unknown>>(
        'SELECT * FROM shorts_pipeline_clips WHERE id = ?', [clipId],
      );
      if (!clip) {
        res.status(404).json({ error: 'Clip não encontrado' });
        return;
      }

      const platforms = platform ? [platform] : ['youtube', 'tiktok', 'instagram'];
      const ids: string[] = [];

      for (const p of platforms) {
        const id = generateId();
        db.execute(
          `INSERT INTO shorts_publish_queue (id, clip_id, agent_id, platform, scheduled_at, status, error_message, published_at, external_post_id, created_at)
           VALUES (?, ?, ?, ?, '', 'pending', '', '', '', ?)`,
          [id, clipId, clip.agent_id, p, now()],
        );
        ids.push(id);
      }

      res.status(201).json({ queueIds: ids });
    } catch (err) {
      console.error('[shorts] Erro ao enfileirar publicação:', err);
      res.status(500).json({ error: 'Erro ao enfileirar publicação' });
    }
  });

  // GET /api/shorts/publish/queue — fila ativa
  app.get('/api/shorts/publish/queue', (req, res) => {
    try {
      const agentId = req.query.agentId as string | undefined;
      let sql = 'SELECT * FROM shorts_publish_queue WHERE status IN (?, ?)';
      const params: unknown[] = ['pending', 'publishing'];

      if (agentId) {
        sql += ' AND agent_id = ?';
        params.push(agentId);
      }

      sql += ' ORDER BY created_at DESC LIMIT 100';
      const rows = db.queryAll<Record<string, unknown>>(sql, params);
      res.json(rows.map(mapQueue));
    } catch (err) {
      console.error('[shorts] Erro ao listar fila:', err);
      res.status(500).json({ error: 'Erro ao listar fila' });
    }
  });

  // GET /api/shorts/publish/history — histórico de publicações
  app.get('/api/shorts/publish/history', (req, res) => {
    try {
      const agentId = req.query.agentId as string | undefined;
      let sql = 'SELECT * FROM shorts_publish_queue WHERE status = ?';
      const params: unknown[] = ['published'];

      if (agentId) {
        sql += ' AND agent_id = ?';
        params.push(agentId);
      }

      sql += ' ORDER BY published_at DESC LIMIT 100';
      const rows = db.queryAll<Record<string, unknown>>(sql, params);
      res.json(rows.map(mapQueue));
    } catch (err) {
      console.error('[shorts] Erro ao listar histórico:', err);
      res.status(500).json({ error: 'Erro ao listar histórico' });
    }
  });

  // DELETE /api/shorts/publish/queue/:id — remover da fila
  app.delete('/api/shorts/publish/queue/:id', (req, res) => {
    try {
      db.execute('DELETE FROM shorts_publish_queue WHERE id = ? AND status = ?', [req.params.id, 'pending']);
      res.json({ success: true });
    } catch (err) {
      console.error('[shorts] Erro ao remover da fila:', err);
      res.status(500).json({ error: 'Erro ao remover da fila' });
    }
  });

  // ─── Metrics ─────────────────────────────────────────────

  // GET /api/shorts/metrics/:agentId — métricas do agent
  app.get('/api/shorts/metrics/:agentId', (req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        `SELECT * FROM shorts_metrics WHERE agent_id = ? ORDER BY collected_at DESC LIMIT 200`,
        [req.params.agentId],
      );
      res.json(rows.map(mapMetrics));
    } catch (err) {
      console.error('[shorts] Erro ao buscar métricas:', err);
      res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
  });

  // GET /api/shorts/metrics/:agentId/summary — resumo 30 dias
  app.get('/api/shorts/metrics/:agentId/summary', (req, res) => {
    try {
      const agentId = req.params.agentId;

      const totals = db.queryOne<Record<string, unknown>>(
        `SELECT
           COALESCE(SUM(views), 0) as total_views,
           COALESCE(SUM(likes), 0) as total_likes,
           COALESCE(SUM(comments), 0) as total_comments,
           COALESCE(SUM(shares), 0) as total_shares,
           COALESCE(SUM(subscribers_gained), 0) as subscribers_gained
         FROM shorts_metrics WHERE agent_id = ?`,
        [agentId],
      );

      const byPlatform = db.queryAll<Record<string, unknown>>(
        `SELECT platform,
           COALESCE(SUM(views), 0) as views,
           COALESCE(SUM(likes), 0) as likes,
           COALESCE(SUM(comments), 0) as comments
         FROM shorts_metrics WHERE agent_id = ?
         GROUP BY platform`,
        [agentId],
      );

      const clipsPublished = db.queryOne<Record<string, unknown>>(
        "SELECT COUNT(*) as count FROM shorts_pipeline_clips WHERE agent_id = ? AND status = 'published'",
        [agentId],
      );

      const totalClips = db.queryOne<Record<string, unknown>>(
        'SELECT COUNT(*) as count FROM shorts_pipeline_clips WHERE agent_id = ?',
        [agentId],
      );

      const platformMap: Record<string, any> = {};
      for (const row of byPlatform) {
        platformMap[row.platform as string] = {
          views: row.views,
          likes: row.likes,
          comments: row.comments,
        };
      }

      res.json({
        agentId,
        totalViews: (totals as any)?.total_views ?? 0,
        totalLikes: (totals as any)?.total_likes ?? 0,
        totalComments: (totals as any)?.total_comments ?? 0,
        totalShares: (totals as any)?.total_shares ?? 0,
        subscribersGained: (totals as any)?.subscribers_gained ?? 0,
        clipsPublished: (clipsPublished as any)?.count ?? 0,
        totalClips: (totalClips as any)?.count ?? 0,
        byPlatform: platformMap,
      });
    } catch (err) {
      console.error('[shorts] Erro ao buscar resumo:', err);
      res.status(500).json({ error: 'Erro ao buscar resumo de métricas' });
    }
  });

  // POST /api/shorts/metrics — registrar métricas
  app.post('/api/shorts/metrics', (req, res) => {
    try {
      const { clipId, agentId, platform, views, likes, comments, shares, subscribersGained } = req.body;

      if (!agentId || !platform) {
        res.status(400).json({ error: 'agentId e platform são obrigatórios' });
        return;
      }

      const id = generateId();
      db.execute(
        `INSERT INTO shorts_metrics (id, clip_id, agent_id, platform, views, likes, comments, shares, subscribers_gained, collected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, clipId ?? '', agentId, platform, views ?? 0, likes ?? 0, comments ?? 0, shares ?? 0, subscribersGained ?? 0, now()],
      );

      res.status(201).json({ id });
    } catch (err) {
      console.error('[shorts] Erro ao registrar métricas:', err);
      res.status(500).json({ error: 'Erro ao registrar métricas' });
    }
  });
}

// ─── Mappers ─────────────────────────────────────────────

function mapQueue(row: Record<string, unknown>) {
  return {
    id: row.id,
    clipId: row.clip_id,
    agentId: row.agent_id,
    platform: row.platform,
    scheduledAt: row.scheduled_at,
    status: row.status,
    errorMessage: row.error_message,
    publishedAt: row.published_at,
    externalPostId: row.external_post_id,
    createdAt: row.created_at,
  };
}

function mapMetrics(row: Record<string, unknown>) {
  return {
    id: row.id,
    clipId: row.clip_id,
    agentId: row.agent_id,
    platform: row.platform,
    views: row.views,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    subscribersGained: row.subscribers_gained,
    collectedAt: row.collected_at,
  };
}
