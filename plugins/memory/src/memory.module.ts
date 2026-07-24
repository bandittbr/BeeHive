// ============================================================================
// Memory :: Module
// ============================================================================
// Memória persistente por projeto com servidor REST.
// ============================================================================

import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createRouter } from './api/routes';

export interface MemoryEntry {
  id: string;
  projectId: string;
  type: string;
  key: string;
  value: unknown;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryQuery {
  projectId?: string;
  type?: string;
  tags?: string[];
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryConfig {
  basePath?: string;
  api?: { port: number; cors: boolean };
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  basePath: path.join(process.cwd(), 'data', 'memory'),
  api: { port: 3096, cors: true },
};

export class MemoryModule {
  private basePath: string;
  private app = express();
  private server: ReturnType<typeof express.application.listen> | null = null;
  private running = false;

  constructor(config?: Partial<MemoryConfig>) {
    const cfg = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.basePath = cfg.basePath!;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  async store(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const full: MemoryEntry = { id: uuidv4(), ...entry, createdAt: now, updatedAt: now };
    const projectDir = path.join(this.basePath, entry.projectId);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, `${full.id}.json`), JSON.stringify(full, null, 2));
    return full;
  }

  async get(entryId: string): Promise<MemoryEntry | undefined> {
    try {
      const projects = await fs.readdir(this.basePath);
      for (const project of projects) {
        try {
          return JSON.parse(await fs.readFile(path.join(this.basePath, project, `${entryId}.json`), 'utf-8'));
        } catch { continue; }
      }
    } catch { /* empty */ }
    return undefined;
  }

  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    const dirs = query.projectId ? [query.projectId] : await this.getProjects();
    for (const project of dirs) {
      try {
        const files = await fs.readdir(path.join(this.basePath, project));
        for (const f of files.filter((f) => f.endsWith('.json'))) {
          const entry: MemoryEntry = JSON.parse(await fs.readFile(path.join(this.basePath, project, f), 'utf-8'));
          if (query.type && entry.type !== query.type) continue;
          if (query.tags && !query.tags.some((t) => entry.tags?.includes(t))) continue;
          results.push(entry);
        }
      } catch { continue; }
    }
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const offset = query.offset ?? 0;
    const limit = query.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  async delete(entryId: string): Promise<void> {
    try {
      const projects = await fs.readdir(this.basePath);
      for (const project of projects) {
        try { await fs.unlink(path.join(this.basePath, project, `${entryId}.json`)); return; }
        catch { continue; }
      }
    } catch { /* empty */ }
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.initialize();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/api/memory', createRouter());
    this.app.get('/health', (_req, res) => res.json({ status: 'ok', module: 'memory' }));
    return new Promise((resolve) => {
      this.server = this.app.listen(DEFAULT_MEMORY_CONFIG.api!.port, () => {
        console.log(`[Memory] API: http://localhost:${DEFAULT_MEMORY_CONFIG.api!.port}/api/memory`);
        this.running = true;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
    this.running = false;
  }

  private async getProjects(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch { return []; }
  }
}

export async function createMemory(config?: Partial<MemoryConfig>): Promise<MemoryModule> {
  const mod = new MemoryModule(config);
  await mod.initialize();
  return mod;
}