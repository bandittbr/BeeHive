import type { Express } from 'express';
import type { ImageProvider } from '../media/imageProvider';
import { sanitizeString } from './shared';

export function mountMediaRoutes(app: Express, imageProvider: ImageProvider): void {
  app.post('/api/media/image', (req, res) => {
    const { prompt, seed } = (req.body ?? {}) as { prompt?: unknown; seed?: unknown };
    const cleanPrompt = sanitizeString(prompt, 2000);

    if (!cleanPrompt) {
      res.status(400).json({ error: 'O campo prompt é obrigatório.' });
      return;
    }

    const url = imageProvider.buildUrl(cleanPrompt, {
      seed: typeof seed === 'number' ? seed : undefined,
    });
    res.json({ url, provider: imageProvider.name });
  });
}
