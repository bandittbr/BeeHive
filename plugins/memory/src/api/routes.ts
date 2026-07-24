import { Router, type Request, type Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function createRouter(): Router {
  const router = Router();
  const memoryDir = path.join(process.cwd(), 'data', 'memory');

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', module: 'memory', timestamp: new Date().toISOString() });
  });

  router.post('/store', async (req: Request, res: Response) => {
    const { projectId, type, key, value, tags } = req.body;
    if (!projectId || !type || !key) {
      res.status(400).json({ error: 'projectId, type e key são obrigatórios' });
      return;
    }
    const projectDir = path.join(memoryDir, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    const entry = { id: uuidv4(), projectId, type, key, value, tags: tags || [], createdAt: new Date().toISOString() };
    await fs.writeFile(path.join(projectDir, `${entry.id}.json`), JSON.stringify(entry, null, 2));
    res.json(entry);
  });

  router.get('/search', async (req: Request, res: Response) => {
    const { projectId, type, limit } = req.query;
    const entries: unknown[] = [];
    const projects = projectId ? [String(projectId)] : await fs.readdir(memoryDir).catch(() => []);
    for (const project of projects) {
      try {
        const files = await fs.readdir(path.join(memoryDir, project));
        for (const f of files.filter((f) => f.endsWith('.json'))) {
          const entry = JSON.parse(await fs.readFile(path.join(memoryDir, project, f), 'utf-8'));
          if (type && entry.type !== type) continue;
          entries.push(entry);
        }
      } catch { continue; }
    }
    res.json({ entries: entries.slice(0, Number(limit) || 50) });
  });

  router.get('/:entryId', async (req: Request, res: Response) => {
    const { entryId } = req.params;
    const projects = await fs.readdir(memoryDir).catch(() => []);
    for (const project of projects) {
      try {
        const entry = JSON.parse(await fs.readFile(path.join(memoryDir, project, `${entryId}.json`), 'utf-8'));
        res.json(entry);
        return;
      } catch { continue; }
    }
    res.status(404).json({ error: 'Entry not found' });
  });

  router.delete('/:entryId', async (req: Request, res: Response) => {
    const { entryId } = req.params;
    const projects = await fs.readdir(memoryDir).catch(() => []);
    for (const project of projects) {
      try {
        await fs.unlink(path.join(memoryDir, project, `${entryId}.json`));
        res.json({ success: true });
        return;
      } catch { continue; }
    }
    res.status(404).json({ error: 'Entry not found' });
  });

  return router;
}