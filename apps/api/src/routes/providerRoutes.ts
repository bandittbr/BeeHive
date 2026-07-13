/**
 * Provider Routes — endpoints REST para gerenciamento de providers de IA.
 *
 * Endpoints:
 *   GET    /api/providers              — lista catálogo com status
 *   POST   /api/providers/:id/save     — salva credenciais e registra
 *   POST   /api/providers/:id/test     — testa conexão
 *   POST   /api/providers/:id/activate — define provider ativo
 *   POST   /api/providers/:id/deactivate — desabilita provider
 *   GET    /api/providers/active       — retorna provider e modelo ativos
 *   POST   /api/providers/model        — define modelo padrão
 *   GET    /api/providers/:id/models   — lista modelos do provider
 */
import type { Express } from 'express';
import type { RuntimeManager } from '@beehive/platform/runtime';

const API = '/api/providers';

function dispatch<T>(runtime: RuntimeManager, type: string, payload?: unknown): Promise<T> {
  return runtime.context.kernel.dispatch({ type, payload });
}

export function mountProviderRoutes(app: Express, runtime: RuntimeManager): void {

  // ── GET /api/providers ─────────────────────────────────────────────────
  app.get(API, async (_req, res) => {
    try {
      const providers = await dispatch(runtime, 'provider.list');
      res.json(providers);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(500).json({ error: detail });
    }
  });

  // ── POST /api/providers/:id/save ───────────────────────────────────────
  app.post(`${API}/:id/save`, async (req, res) => {
    try {
      const { id } = req.params;
      const { apiKey, baseUrl } = req.body ?? {};
      const result = await dispatch(runtime, 'provider.save', {
        providerId: id,
        credentials: { apiKey, baseUrl },
      });
      res.json(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(400).json({ error: detail });
    }
  });

  // ── POST /api/providers/:id/test ───────────────────────────────────────
  app.post(`${API}/:id/test`, async (req, res) => {
    try {
      const { id } = req.params;
      const { apiKey, baseUrl } = req.body ?? {};
      const result = await dispatch<{ ok: boolean; detail?: string }>(runtime, 'provider.test', {
        providerId: id,
        credentials: { apiKey, baseUrl },
      });
      res.json(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(400).json({ ok: false, detail });
    }
  });

  // ── POST /api/providers/:id/activate ───────────────────────────────────
  app.post(`${API}/:id/activate`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dispatch(runtime, 'provider.activate', { providerId: id });
      res.json(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(400).json({ error: detail });
    }
  });

  // ── POST /api/providers/:id/deactivate ─────────────────────────────────
  app.post(`${API}/:id/deactivate`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dispatch(runtime, 'provider.deactivate', { providerId: id });
      res.json(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(400).json({ error: detail });
    }
  });

  // ── GET /api/providers/active ──────────────────────────────────────────
  app.get(`${API}/active`, async (_req, res) => {
    try {
      const result = await dispatch(runtime, 'provider.active');
      res.json(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(500).json({ error: detail });
    }
  });

  // ── POST /api/providers/model ──────────────────────────────────────────
  app.post(`${API}/model`, async (req, res) => {
    try {
      const { model } = req.body ?? {};
      if (!model || typeof model !== 'string') {
        res.status(400).json({ error: 'O campo model é obrigatório.' });
        return;
      }
      const manager = runtime.context.aiRegistry as any;
      if (manager?.setDefaultModel) {
        manager.setDefaultModel(model);
      }
      res.json({ ok: true, model });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(400).json({ error: detail });
    }
  });

  // ── GET /api/providers/:id/models ──────────────────────────────────────
  app.get(`${API}/:id/models`, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await dispatch(runtime, 'provider.models', { providerId: id });
      res.json(result);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(500).json({ error: detail });
    }
  });
}
