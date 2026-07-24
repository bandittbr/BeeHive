import { Router, type Request, type Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createRouter(): Router {
  const router = Router();
  const pluginsDir = path.join(process.cwd(), 'plugins');

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', module: 'marketplace', timestamp: new Date().toISOString() });
  });

  router.get('/search', async (req: Request, res: Response) => {
    const q = (req.query.q as string || '').toLowerCase();
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    const results: unknown[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const content = await fs.readFile(path.join(pluginsDir, entry.name, 'src', 'manifest.yaml'), 'utf-8');
        const name = content.match(/name:\s*(.+)/)?.[1]?.trim() || entry.name;
        const description = content.match(/description:\s*"(.+?)"/)?.[1] || '';
        const capabilities = [...content.matchAll(/-\s*id:\s*(\S+)/g)].map((m) => m[1]);
        if (!q || name.toLowerCase().includes(q) || description.toLowerCase().includes(q)) {
          results.push({ id: entry.name, name, description, capabilities, installed: true });
        }
      } catch { continue; }
    }
    res.json({ plugins: results });
  });

  router.get('/installed', async (_req: Request, res: Response) => {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    const plugins: unknown[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const content = await fs.readFile(path.join(pluginsDir, entry.name, 'src', 'manifest.yaml'), 'utf-8');
        const name = content.match(/name:\s*(.+)/)?.[1]?.trim() || entry.name;
        const version = content.match(/version:\s*([\d.]+)/)?.[1] || '0.0.0';
        plugins.push({ id: entry.name, name, version });
      } catch { continue; }
    }
    res.json({ plugins });
  });

  return router;
}