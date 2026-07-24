import { Router, type Request, type Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

export function createRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', module: 'module-loader', timestamp: new Date().toISOString() });
  });

  router.post('/scan', async (req: Request, res: Response) => {
    const dir = req.body.directory || path.join(process.cwd(), 'plugins');
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const plugins: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          await fs.access(path.join(dir, entry.name, 'src', 'manifest.yaml'));
          plugins.push(entry.name);
        } catch { continue; }
      }
      res.json({ directory: dir, plugins });
    } catch (error) {
      res.status(400).json({ error: `Diretório inválido: ${dir}` });
    }
  });

  router.post('/load', async (req: Request, res: Response) => {
    const { name, directory } = req.body;
    if (!name) { res.status(400).json({ error: 'name é obrigatório' }); return; }
    const dir = directory || path.join(process.cwd(), 'plugins');
    try {
      await fs.access(path.join(dir, name, 'src', 'plugin.ts'));
      res.json({ loaded: true, name, path: path.join(dir, name, 'src', 'plugin.ts') });
    } catch {
      res.status(404).json({ loaded: false, error: `Plugin "${name}" não encontrado` });
    }
  });

  return router;
}