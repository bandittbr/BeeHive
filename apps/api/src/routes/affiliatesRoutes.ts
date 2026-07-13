import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';
import type { DiscoveryRule, AutomationSettings, Product, ContentItem, Publication } from '@beehive/platform';

/**
 * Rotas do módulo Afiliados — CRUD para discovery rules, automation settings,
 * produtos, conteúdo e publicações.
 *
 * Dados persistidos em SQLite via DatabaseManager.
 */

function generateId(): string {
  return `aff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function mountAffiliatesRoutes(app: Express, db: DatabaseManager): void {
  // ─── Discovery Rules ─────────────────────────────────────────────

  // GET /api/affiliates/discovery-rules
  app.get('/api/affiliates/discovery-rules', (_req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM discovery_rules ORDER BY created_at DESC',
      );
      res.json(rows.map(mapRule));
    } catch (err) {
      console.error('[affiliates] Erro ao listar regras:', err);
      res.status(500).json({ error: 'Erro ao listar regras de discovery' });
    }
  });

  // POST /api/affiliates/discovery-rules
  app.post('/api/affiliates/discovery-rules', (req, res) => {
    try {
      const { category, minPrice, maxPrice, minCommissionRate, minRating, affiliateProviders } = req.body;

      if (!category || typeof category !== 'string') {
        res.status(400).json({ error: 'Campo category é obrigatório' });
        return;
      }

      const id = generateId();
      const tenantId = 'default';
      const providers = Array.isArray(affiliateProviders) ? affiliateProviders.join(',') : 'mercado_livre';

      db.execute(
        `INSERT INTO discovery_rules (id, tenant_id, category, min_price, max_price, min_commission_rate, min_rating, affiliate_providers, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, tenantId, category, minPrice ?? 0, maxPrice ?? 10000, minCommissionRate ?? 5, minRating ?? 0, providers, now()],
      );

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM discovery_rules WHERE id = ?', [id]);
      res.status(201).json(mapRule(row!));
    } catch (err) {
      console.error('[affiliates] Erro ao criar regra:', err);
      res.status(500).json({ error: 'Erro ao criar regra de discovery' });
    }
  });

  // PATCH /api/affiliates/discovery-rules/:id
  app.patch('/api/affiliates/discovery-rules/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const params: unknown[] = [];

      if (req.body.category !== undefined) { updates.push('category = ?'); params.push(req.body.category); }
      if (req.body.minPrice !== undefined) { updates.push('min_price = ?'); params.push(req.body.minPrice); }
      if (req.body.maxPrice !== undefined) { updates.push('max_price = ?'); params.push(req.body.maxPrice); }
      if (req.body.minCommissionRate !== undefined) { updates.push('min_commission_rate = ?'); params.push(req.body.minCommissionRate); }
      if (req.body.minRating !== undefined) { updates.push('min_rating = ?'); params.push(req.body.minRating); }
      if (req.body.active !== undefined) { updates.push('active = ?'); params.push(req.body.active ? 1 : 0); }
      if (req.body.affiliateProviders !== undefined) { updates.push('affiliate_providers = ?'); params.push(Array.isArray(req.body.affiliateProviders) ? req.body.affiliateProviders.join(',') : req.body.affiliateProviders); }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      params.push(id);
      db.execute(
        `UPDATE discovery_rules SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM discovery_rules WHERE id = ?', [id]);
      if (!row) {
        res.status(404).json({ error: 'Regra não encontrada' });
        return;
      }
      res.json(mapRule(row));
    } catch (err) {
      console.error('[affiliates] Erro ao atualizar regra:', err);
      res.status(500).json({ error: 'Erro ao atualizar regra' });
    }
  });

  // DELETE /api/affiliates/discovery-rules/:id
  app.delete('/api/affiliates/discovery-rules/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.execute('DELETE FROM discovery_rules WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error('[affiliates] Erro ao deletar regra:', err);
      res.status(500).json({ error: 'Erro ao deletar regra' });
    }
  });

  // ─── Automation Settings ─────────────────────────────────────────

  // GET /api/affiliates/automation-settings
  app.get('/api/affiliates/automation-settings', (_req, res) => {
    try {
      let row = db.queryOne<Record<string, unknown>>(
        'SELECT * FROM automation_settings WHERE tenant_id = ?',
        ['default'],
      );
      if (!row) {
        // Cria padrão se não existir
        db.execute(
          `INSERT INTO automation_settings (tenant_id, posts_per_day, video_enabled, kill_switch_active, updated_at)
           VALUES (?, 5, 0, 0, ?)`,
          ['default', now()],
        );
        row = db.queryOne<Record<string, unknown>>(
          'SELECT * FROM automation_settings WHERE tenant_id = ?',
          ['default'],
        );
      }
      res.json(mapSettings(row!));
    } catch (err) {
      console.error('[affiliates] Erro ao carregar configurações:', err);
      res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  });

  // PATCH /api/affiliates/automation-settings
  app.patch('/api/affiliates/automation-settings', (req, res) => {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (req.body.postsPerDay !== undefined) { updates.push('posts_per_day = ?'); params.push(req.body.postsPerDay); }
      if (req.body.videoEnabled !== undefined) { updates.push('video_enabled = ?'); params.push(req.body.videoEnabled ? 1 : 0); }
      if (req.body.killSwitchActive !== undefined) { updates.push('kill_switch_active = ?'); params.push(req.body.killSwitchActive ? 1 : 0); }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      updates.push('updated_at = ?');
      params.push(now());
      params.push('default');

      db.execute(
        `UPDATE automation_settings SET ${updates.join(', ')} WHERE tenant_id = ?`,
        params,
      );

      const row = db.queryOne<Record<string, unknown>>(
        'SELECT * FROM automation_settings WHERE tenant_id = ?',
        ['default'],
      );
      res.json(mapSettings(row!));
    } catch (err) {
      console.error('[affiliates] Erro ao atualizar configurações:', err);
      res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  });

  // ─── Products ────────────────────────────────────────────────────

  // GET /api/affiliates/products
  app.get('/api/affiliates/products', (_req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM affiliate_products ORDER BY discovered_at DESC',
      );
      res.json(rows.map(mapProduct));
    } catch (err) {
      console.error('[affiliates] Erro ao listar produtos:', err);
      res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  });

  // PATCH /api/affiliates/products/:id
  app.patch('/api/affiliates/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const params: unknown[] = [];

      if (req.body.status !== undefined) { updates.push('status = ?'); params.push(req.body.status); }

      if (updates.length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' });
        return;
      }

      params.push(id);
      db.execute(
        `UPDATE affiliate_products SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );

      const row = db.queryOne<Record<string, unknown>>('SELECT * FROM affiliate_products WHERE id = ?', [id]);
      if (!row) {
        res.status(404).json({ error: 'Produto não encontrado' });
        return;
      }
      res.json(mapProduct(row));
    } catch (err) {
      console.error('[affiliates] Erro ao atualizar produto:', err);
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  });

  // ─── Content ─────────────────────────────────────────────────────

  // GET /api/affiliates/content
  app.get('/api/affiliates/content', (_req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM affiliate_content ORDER BY created_at DESC',
      );
      res.json(rows.map(mapContent));
    } catch (err) {
      console.error('[affiliates] Erro ao listar conteúdo:', err);
      res.status(500).json({ error: 'Erro ao listar conteúdo' });
    }
  });

  // ─── Publications ────────────────────────────────────────────────

  // GET /api/affiliates/publications
  app.get('/api/affiliates/publications', (_req, res) => {
    try {
      const rows = db.queryAll<Record<string, unknown>>(
        'SELECT * FROM affiliate_publications ORDER BY published_at DESC',
      );
      res.json(rows.map(mapPublication));
    } catch (err) {
      console.error('[affiliates] Erro ao listar publicações:', err);
      res.status(500).json({ error: 'Erro ao listar publicações' });
    }
  });
}

// ─── Mappers (SQL -> JS) ───────────────────────────────────────────

function mapRule(row: Record<string, unknown>): DiscoveryRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    category: row.category as string,
    minPrice: row.min_price as number,
    maxPrice: row.max_price as number,
    minCommissionRate: row.min_commission_rate as number,
    minRating: row.min_rating as number,
    affiliateProviders: ((row.affiliate_providers as string) ?? 'mercado_livre').split(',').map((s) => s.trim()) as DiscoveryRule['affiliateProviders'],
    active: Boolean(row.active),
    createdAt: row.created_at as string,
  };
}

function mapSettings(row: Record<string, unknown>): AutomationSettings {
  return {
    tenantId: row.tenant_id as string,
    postsPerDay: row.posts_per_day as number,
    videoEnabled: Boolean(row.video_enabled),
    killSwitchActive: Boolean(row.kill_switch_active),
    updatedAt: row.updated_at as string,
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    affiliateProvider: row.affiliate_provider as Product['affiliateProvider'],
    externalId: row.external_id as string,
    title: row.title as string,
    price: row.price as number,
    originalPrice: row.original_price as number,
    commissionRate: row.commission_rate as number,
    rating: row.rating as number,
    imageUrl: row.image_url as string,
    affiliateLink: row.affiliate_link as string,
    qualityScore: row.quality_score as number,
    status: row.status as Product['status'],
    discoveredAt: row.discovered_at as string,
  };
}

function mapContent(row: Record<string, unknown>): ContentItem {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    productId: row.product_id as string,
    caption: row.caption as string,
    hashtags: JSON.parse((row.hashtags as string) ?? '[]'),
    mediaType: row.media_type as ContentItem['mediaType'],
    mediaUrls: JSON.parse((row.media_urls as string) ?? '[]'),
    aiProviderUsed: row.ai_provider_used as string,
    status: row.status as ContentItem['status'],
    createdAt: row.created_at as string,
    publishedAt: row.published_at as string | undefined,
  };
}

function mapPublication(row: Record<string, unknown>): Publication {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    contentId: row.content_id as string,
    socialProvider: row.social_provider as Publication['socialProvider'],
    externalPostId: row.external_post_id as string | undefined,
    publishedAt: row.published_at as string | undefined,
    status: row.status as Publication['status'],
    errorMessage: row.error_message as string | undefined,
  };
}
