import type { Express } from 'express';
import { buildContentPlanMessages } from '../agents/contentStrategist';
import { buildPostsMessages } from '../agents/postWriter';
import type { IntelligenceProvider } from '../intelligence/types';
import { sanitizeString, streamNdjsonResponse } from './shared';

export function mountBusinessRoutes(app: Express, provider: IntelligenceProvider): void {
  app.post('/api/business/content-plan', async (req, res) => {
    const { niche, brand } = (req.body ?? {}) as { niche?: unknown; brand?: unknown };
    const cleanNiche = sanitizeString(niche);

    if (!cleanNiche) {
      res.status(400).json({ error: 'O campo niche é obrigatório.' });
      return;
    }

    const cleanBrand = sanitizeString(brand);
    const messages = buildContentPlanMessages({ niche: cleanNiche, brand: cleanBrand });

    await streamNdjsonResponse(res, (signal) => provider.chatStream(messages, signal));
  });

  app.post('/api/business/posts', async (req, res) => {
    const { niche, brand, plan } = (req.body ?? {}) as {
      niche?: unknown;
      brand?: unknown;
      plan?: unknown;
    };
    const cleanNiche = sanitizeString(niche);

    if (!cleanNiche) {
      res.status(400).json({ error: 'O campo niche é obrigatório.' });
      return;
    }

    const cleanBrand = sanitizeString(brand);
    const cleanPlan = sanitizeString(plan);
    const messages = buildPostsMessages({ niche: cleanNiche, brand: cleanBrand, plan: cleanPlan });

    await streamNdjsonResponse(res, (signal) => provider.chatStream(messages, signal));
  });
}
