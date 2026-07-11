import type { Express } from 'express';
import { config } from '../config';
import type { RuntimeConfig } from '../runtimeConfig';

interface ProviderLike {
  name: string;
}

export function mountSystemRoutes(app: Express, provider: ProviderLike, runtime: RuntimeConfig): void {
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', provider: provider.name, runtime: runtime.status ?? 'unknown' });
  });

  app.get('/api/models', async (_req, res) => {
    try {
      const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama respondeu ${response.status}`);
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = (data.models ?? []).map((model) => model.name);
      res.json({ models, current: runtime.model });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'erro desconhecido';
      res.status(502).json({ error: 'Não foi possível listar os modelos do Ollama.', detail });
    }
  });

  app.post('/api/settings/model', (req, res) => {
    const { model } = (req.body ?? {}) as { model?: string };
    if (!model || typeof model !== 'string') {
      res.status(400).json({ error: 'O campo model é obrigatório.' });
      return;
    }

    runtime.model = model;
    res.json({ current: runtime.model });
  });
}
