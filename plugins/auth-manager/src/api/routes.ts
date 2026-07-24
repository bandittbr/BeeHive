import { Router, type Request, type Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export function createRouter(): Router {
  const router = Router();
  const authDir = path.join(process.cwd(), 'data', 'auth');

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', module: 'auth-manager', timestamp: new Date().toISOString() });
  });

  router.post('/authenticate', async (req: Request, res: Response) => {
    const { apiKey } = req.body;
    if (!apiKey) { res.status(400).json({ error: 'apiKey é obrigatório' }); return; }

    const keysPath = path.join(authDir, 'api-keys.json');
    const keys = JSON.parse(await fs.readFile(keysPath, 'utf-8').catch(() => '{}'));
    const keyEntry = keys[apiKey];

    if (!keyEntry) {
      res.status(401).json({ authenticated: false, error: 'Chave inválida' });
      return;
    }

    const session = {
      id: uuidv4(), userId: keyEntry.userId, role: keyEntry.role || 'user',
      permissions: keyEntry.permissions || [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const sessionsPath = path.join(authDir, 'sessions.json');
    const sessions = JSON.parse(await fs.readFile(sessionsPath, 'utf-8').catch(() => '{}'));
    sessions[session.id] = session;
    await fs.writeFile(sessionsPath, JSON.stringify(sessions, null, 2));

    res.json({ authenticated: true, session });
  });

  router.post('/keys', async (req: Request, res: Response) => {
    const { userId, permissions } = req.body;
    if (!userId) { res.status(400).json({ error: 'userId é obrigatório' }); return; }

    const apiKey = `bh_${randomBytes(24).toString('hex')}`;
    const keysPath = path.join(authDir, 'api-keys.json');
    const keys = JSON.parse(await fs.readFile(keysPath, 'utf-8').catch(() => '{}'));
    keys[apiKey] = { userId, permissions: permissions || [], role: 'user', createdAt: new Date().toISOString() };
    await fs.writeFile(keysPath, JSON.stringify(keys, null, 2));

    res.json({ apiKey });
  });

  router.post('/validate', async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    if (!sessionId) { res.status(400).json({ error: 'sessionId é obrigatório' }); return; }

    const sessionsPath = path.join(authDir, 'sessions.json');
    const sessions = JSON.parse(await fs.readFile(sessionsPath, 'utf-8').catch(() => '{}'));
    const session = sessions[sessionId];

    if (!session || new Date(session.expiresAt) < new Date()) {
      res.json({ valid: false });
      return;
    }
    res.json({ valid: true, session });
  });

  return router;
}