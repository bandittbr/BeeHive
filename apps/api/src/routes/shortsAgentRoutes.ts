import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform';

/**
 * Rotas CRUD para agentes de Cortes Youtube e suas redes sociais.
 */

function generateId(): string {
  return `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function mountShortsAgentRoutes(app: Express, db: DatabaseManager): void {

  // ─── Agents ──────────────────────────────────────────────

  // GET /api/shorts/agents
  app.get('/api/shorts/agents', (_req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_agents ORDER BY created_at DESC',
      );
      res.json(rows.map(mapAgent));
    } catch (err) {
      console.error('[shorts] Erro ao listar agents:', err);
      res.status(500).json({ error: 'Erro ao listar agents' });
    }
  });

  // POST /api/shorts/agents
  app.post('/api/shorts/agents', (req, res) => {
    try {
      const { name, description, niche, defaultProviderId } = req.body;
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Campo name é obrigatório' });
        return;
      }

      const id = generateId();
      const ts = now();

      db.execute(
        `INSERT INTO shorts_agents (id, name, description, avatar_url, niche, default_provider_id, active, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, ?, 1, ?, ?)`,
        [id, name, description ?? '', niche ?? '', defaultProviderId ?? '', ts, ts],
      );

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_agents WHERE id = ?', [id]);
      res.status(201).json(mapAgent(row!));
    } catch (err) {
      console.error('[shorts] Erro ao criar agent:', err);
      res.status(500).json({ error: 'Erro ao criar agent' });
    }
  });

  // GET /api/shorts/agents/:id
  app.get('/api/shorts/agents/:id', (req, res) => {
    try {
      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_agents WHERE id = ?', [req.params.id]);
      if (!row) {
        res.status(404).json({ error: 'Agent não encontrado' });
        return;
      }

      const socials = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_agent_social WHERE agent_id = ? ORDER BY connected_at DESC',
        [req.params.id],
      );

      const activeJobs = db.queryOne<{count: number}>(
        `SELECT COUNT(*) as count FROM shorts_pipeline_jobs WHERE agent_id = ? AND status NOT IN ('done', 'error')`,
        [req.params.id],
      );

      const totalClips = db.queryOne<{count: number}>(
        'SELECT COUNT(*) as count FROM shorts_pipeline_clips WHERE agent_id = ?',
        [req.params.id],
      );

      const metrics = db.queryOne<{total_views: number; total_likes: number; total_comments: number; total_shares: number}>(
        `SELECT COALESCE(SUM(views),0) as total_views, COALESCE(SUM(likes),0) as total_likes,
                COALESCE(SUM(comments),0) as total_comments, COALESCE(SUM(shares),0) as total_shares
         FROM shorts_metrics WHERE agent_id = ?`,
        [req.params.id],
      );

      const recentJobs = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_pipeline_jobs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10',
        [req.params.id],
      );

      res.json({
        agent: mapAgent(row),
        socialAccounts: socials.map(mapSocial),
        activeJobs: activeJobs?.count ?? 0,
        totalClips: totalClips?.count ?? 0,
        metrics: {
          totalViews: metrics?.total_views ?? 0,
          totalLikes: metrics?.total_likes ?? 0,
          totalComments: metrics?.total_comments ?? 0,
          totalShares: metrics?.total_shares ?? 0,
        },
        recentJobs: recentJobs.map(mapJob),
      });
    } catch (err) {
      console.error('[shorts] Erro ao buscar agent:', err);
      res.status(500).json({ error: 'Erro ao buscar agent' });
    }
  });

  // PATCH /api/shorts/agents/:id
  app.patch('/api/shorts/agents/:id', (req, res) => {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (req.body.name !== undefined) { updates.push('name = ?'); params.push(req.body.name); }
      if (req.body.description !== undefined) { updates.push('description = ?'); params.push(req.body.description); }
      if (req.body.niche !== undefined) { updates.push('niche = ?'); params.push(req.body.niche); }
      if (req.body.defaultProviderId !== undefined) { updates.push('default_provider_id = ?'); params.push(req.body.defaultProviderId); }
      if (req.body.active !== undefined) { updates.push('active = ?'); params.push(req.body.active ? 1 : 0); }
      if (req.body.avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(req.body.avatarUrl); }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      updates.push('updated_at = ?');
      params.push(now());
      params.push(req.params.id);

      db.execute(`UPDATE shorts_agents SET ${updates.join(', ')} WHERE id = ?`, params);

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_agents WHERE id = ?', [req.params.id]);
      if (!row) {
        res.status(404).json({ error: 'Agent não encontrado' });
        return;
      }
      res.json(mapAgent(row));
    } catch (err) {
      console.error('[shorts] Erro ao atualizar agent:', err);
      res.status(500).json({ error: 'Erro ao atualizar agent' });
    }
  });

  // DELETE /api/shorts/agents/:id
  app.delete('/api/shorts/agents/:id', (req, res) => {
    try {
      db.execute('DELETE FROM shorts_agents WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('[shorts] Erro ao deletar agent:', err);
      res.status(500).json({ error: 'Erro ao deletar agent' });
    }
  });

  // ─── Social Accounts ─────────────────────────────────────

  // GET /api/shorts/agents/:id/social
  app.get('/api/shorts/agents/:id/social', (req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM shorts_agent_social WHERE agent_id = ? ORDER BY connected_at DESC',
        [req.params.id],
      );
      res.json(rows.map(mapSocial));
    } catch (err) {
      console.error('[shorts] Erro ao listar redes:', err);
      res.status(500).json({ error: 'Erro ao listar redes sociais' });
    }
  });

  // POST /api/shorts/agents/:id/social
  app.post('/api/shorts/agents/:id/social', (req, res) => {
    try {
      const { platform, accountName, accessToken, refreshToken } = req.body;
      if (!platform || !['youtube', 'tiktok', 'instagram'].includes(platform)) {
        res.status(400).json({ error: 'Plataforma inválida (youtube|tiktok|instagram)' });
        return;
      }

      const id = generateId();
      db.execute(
        `INSERT INTO shorts_agent_social (id, agent_id, platform, account_name, access_token, refresh_token, token_expires_at, connected_at, active)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, 1)`,
        [id, req.params.id, platform, accountName ?? '', accessToken ?? '', refreshToken ?? '', now()],
      );

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_agent_social WHERE id = ?', [id]);
      res.status(201).json(mapSocial(row!));
    } catch (err) {
      console.error('[shorts] Erro ao conectar rede:', err);
      res.status(500).json({ error: 'Erro ao conectar rede social' });
    }
  });

  // DELETE /api/shorts/agents/:id/social/:sid
  app.delete('/api/shorts/agents/:id/social/:sid', (req, res) => {
    try {
      db.execute(
        'DELETE FROM shorts_agent_social WHERE id = ? AND agent_id = ?',
        [req.params.sid, req.params.id],
      );
      res.json({ success: true });
    } catch (err) {
      console.error('[shorts] Erro ao desconectar rede:', err);
      res.status(500).json({ error: 'Erro ao desconectar rede' });
    }
  });

  // PATCH /api/shorts/agents/:id/social/:sid
  app.patch('/api/shorts/agents/:id/social/:sid', (req, res) => {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (req.body.active !== undefined) { updates.push('active = ?'); params.push(req.body.active ? 1 : 0); }
      if (req.body.accountName !== undefined) { updates.push('account_name = ?'); params.push(req.body.accountName); }
      if (req.body.accessToken !== undefined) { updates.push('access_token = ?'); params.push(req.body.accessToken); }
      if (req.body.refreshToken !== undefined) { updates.push('refresh_token = ?'); params.push(req.body.refreshToken); }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      params.push(req.params.sid);
      params.push(req.params.id);
      db.execute(`UPDATE shorts_agent_social SET ${updates.join(', ')} WHERE id = ? AND agent_id = ?`, params);

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM shorts_agent_social WHERE id = ?', [req.params.sid]);
      if (!row) {
        res.status(404).json({ error: 'Rede social não encontrada' });
        return;
      }
      res.json(mapSocial(row));
    } catch (err) {
      console.error('[shorts] Erro ao atualizar rede:', err);
      res.status(500).json({ error: 'Erro ao atualizar rede social' });
    }
  });
}

// ─── Mappers ─────────────────────────────────────────────

function mapAgent(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatar_url,
    niche: row.niche,
    defaultProviderId: row.default_provider_id,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSocial(row: Record<string, unknown>) {
  return {
    id: row.id,
    agentId: row.agent_id,
    platform: row.platform,
    accountName: row.account_name,
    connectedAt: row.connected_at,
    active: Boolean(row.active),
  };
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
