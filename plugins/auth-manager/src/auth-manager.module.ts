// ============================================================================
// Auth Manager :: Module
// ============================================================================
// Autenticação e autorização com servidor REST.
// ============================================================================

import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createRouter } from './api/routes';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  role: string;
  permissions: string[];
  createdAt: string;
  expiresAt: string;
}

export interface AuthConfig {
  storagePath?: string;
  api?: { port: number; cors: boolean };
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  storagePath: path.join(process.cwd(), 'data', 'auth'),
  api: { port: 3098, cors: true },
};

export class AuthManagerModule {
  private users = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSession>();
  private apiKeys = new Map<string, { userId: string; permissions: string[] }>();
  private storagePath: string;
  private app = express();
  private server: ReturnType<typeof express.application.listen> | null = null;
  private running = false;

  constructor(config?: Partial<AuthConfig>) {
    const cfg = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.storagePath = cfg.storagePath!;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    try {
      const data = await fs.readFile(path.join(this.storagePath, 'users.json'), 'utf-8');
      const users: AuthUser[] = JSON.parse(data);
      for (const u of users) this.users.set(u.id, u);
    } catch { /* empty */ }
  }

  async createUser(user: Omit<AuthUser, 'id' | 'createdAt'>): Promise<AuthUser> {
    const full: AuthUser = { id: uuidv4(), ...user, createdAt: new Date().toISOString() };
    this.users.set(full.id, full);
    await this.persist();
    return full;
  }

  async authenticate(apiKey: string): Promise<AuthSession | null> {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) return null;
    const user = this.users.get(keyData.userId);
    if (!user) return null;
    const session: AuthSession = {
      id: uuidv4(), userId: user.id, role: user.role,
      permissions: keyData.permissions,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  validateSession(sessionId: string): AuthSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  hasPermission(session: AuthSession, permission: string): boolean {
    if (session.role === 'admin') return true;
    return session.permissions.includes(permission);
  }

  generateApiKey(userId: string, permissions: string[]): string {
    const key = `bh_${randomBytes(24).toString('hex')}`;
    this.apiKeys.set(key, { userId, permissions });
    return key;
  }

  revokeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.initialize();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/api/auth', createRouter());
    this.app.get('/health', (_req, res) => res.json({ status: 'ok', module: 'auth-manager' }));
    return new Promise((resolve) => {
      this.server = this.app.listen(DEFAULT_AUTH_CONFIG.api!.port, () => {
        console.log(`[AuthManager] API: http://localhost:${DEFAULT_AUTH_CONFIG.api!.port}/api/auth`);
        this.running = true;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
    this.running = false;
  }

  private async persist(): Promise<void> {
    await fs.writeFile(path.join(this.storagePath, 'users.json'), JSON.stringify(Array.from(this.users.values()), null, 2));
  }
}

export async function createAuthManager(config?: Partial<AuthConfig>): Promise<AuthManagerModule> {
  const mod = new AuthManagerModule(config);
  await mod.initialize();
  return mod;
}