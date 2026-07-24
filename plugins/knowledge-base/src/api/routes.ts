import { Router, type Request, type Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function createRouter(): Router {
  const router = Router();
  const kbDir = path.join(process.cwd(), 'data', 'knowledge');

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', module: 'knowledge-base', timestamp: new Date().toISOString() });
  });

  router.post('/index', async (req: Request, res: Response) => {
    const { source, category, title, content, metadata } = req.body;
    if (!source || !category || !title || !content) {
      res.status(400).json({ error: 'source, category, title e content são obrigatórios' });
      return;
    }
    await fs.mkdir(path.join(kbDir, 'documents'), { recursive: true });
    await fs.mkdir(path.join(kbDir, 'index'), { recursive: true });

    const doc = { id: uuidv4(), source, category, title, content, metadata: metadata || {}, indexedAt: new Date().toISOString() };
    await fs.writeFile(path.join(kbDir, 'documents', `${doc.id}.json`), JSON.stringify(doc, null, 2));

    const tokens = content.toLowerCase().replace(/[^\w\sÀ-ÿ]/g, '').split(/\s+/).filter((t: string) => t.length > 2);
    for (const token of [...new Set(tokens)]) {
      const tokenFile = path.join(kbDir, 'index', `${token}.json`);
      try {
        const idx = JSON.parse(await fs.readFile(tokenFile, 'utf-8'));
        if (!idx.includes(doc.id)) idx.push(doc.id);
        await fs.writeFile(tokenFile, JSON.stringify(idx));
      } catch {
        await fs.writeFile(tokenFile, JSON.stringify([doc.id]));
      }
    }
    res.json({ documentId: doc.id });
  });

  router.get('/search', async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) { res.json({ results: [] }); return; }

    const tokens = query.toLowerCase().replace(/[^\w\sÀ-ÿ]/g, '').split(/\s+/).filter((t) => t.length > 2);
    const scores = new Map<string, number>();
    for (const token of tokens) {
      try {
        const ids = JSON.parse(await fs.readFile(path.join(kbDir, 'index', `${token}.json`), 'utf-8'));
        for (const id of ids) scores.set(id, (scores.get(id) || 0) + 1);
      } catch { continue; }
    }

    const limit = Number(req.query.limit) || 10;
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const results: unknown[] = [];
    for (const [docId, score] of sorted) {
      try {
        const doc = JSON.parse(await fs.readFile(path.join(kbDir, 'documents', `${docId}.json`), 'utf-8'));
        results.push({ document: doc, score: score / tokens.length });
      } catch { continue; }
    }
    res.json({ results });
  });

  router.get('/stats', async (_req: Request, res: Response) => {
    const docs = await fs.readdir(path.join(kbDir, 'documents')).catch(() => []);
    const idx = await fs.readdir(path.join(kbDir, 'index')).catch(() => []);
    res.json({ totalDocuments: docs.length, totalTokens: idx.length });
  });

  return router;
}