// ============================================================================
// Knowledge Base :: Module
// ============================================================================
// RAG com busca full-text e servidor REST.
// ============================================================================

import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createRouter } from './api/routes';

export interface KnowledgeDocument {
  id: string;
  source: string;
  sourceId?: string;
  category: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  indexedAt: string;
}

export interface KnowledgeSearchResult {
  document: KnowledgeDocument;
  score: number;
}

export interface KnowledgeBaseConfig {
  basePath?: string;
  api?: { port: number; cors: boolean };
}

export const DEFAULT_KB_CONFIG: KnowledgeBaseConfig = {
  basePath: path.join(process.cwd(), 'data', 'knowledge'),
  api: { port: 3097, cors: true },
};

export class KnowledgeBaseModule {
  private basePath: string;
  private app = express();
  private server: ReturnType<typeof express.application.listen> | null = null;
  private running = false;

  constructor(config?: Partial<KnowledgeBaseConfig>) {
    const cfg = { ...DEFAULT_KB_CONFIG, ...config };
    this.basePath = cfg.basePath!;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'documents'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'index'), { recursive: true });
  }

  async index(document: Omit<KnowledgeDocument, 'id' | 'indexedAt'>): Promise<KnowledgeDocument> {
    const doc: KnowledgeDocument = { id: uuidv4(), ...document, indexedAt: new Date().toISOString() };
    await fs.writeFile(path.join(this.basePath, 'documents', `${doc.id}.json`), JSON.stringify(doc, null, 2));

    const tokens = this.tokenize(doc.content);
    for (const token of tokens) {
      const tokenFile = path.join(this.basePath, 'index', `${token}.json`);
      try {
        const idx: string[] = JSON.parse(await fs.readFile(tokenFile, 'utf-8'));
        if (!idx.includes(doc.id)) idx.push(doc.id);
        await fs.writeFile(tokenFile, JSON.stringify(idx));
      } catch {
        await fs.writeFile(tokenFile, JSON.stringify([doc.id]));
      }
    }
    return doc;
  }

  async search(query: string, limit = 10): Promise<KnowledgeSearchResult[]> {
    const tokens = this.tokenize(query);
    const scores = new Map<string, number>();
    for (const token of tokens) {
      try {
        const ids: string[] = JSON.parse(await fs.readFile(path.join(this.basePath, 'index', `${token}.json`), 'utf-8'));
        for (const id of ids) scores.set(id, (scores.get(id) || 0) + 1);
      } catch { continue; }
    }
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
    const results: KnowledgeSearchResult[] = [];
    for (const [docId, score] of sorted) {
      try {
        const doc: KnowledgeDocument = JSON.parse(await fs.readFile(path.join(this.basePath, 'documents', `${docId}.json`), 'utf-8'));
        results.push({ document: doc, score: score / tokens.length });
      } catch { continue; }
    }
    return results;
  }

  async stats(): Promise<{ totalDocuments: number; totalTokens: number }> {
    try {
      const docs = await fs.readdir(path.join(this.basePath, 'documents'));
      const idx = await fs.readdir(path.join(this.basePath, 'index'));
      return { totalDocuments: docs.length, totalTokens: idx.length };
    } catch { return { totalDocuments: 0, totalTokens: 0 }; }
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.initialize();
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use('/api/knowledge', createRouter());
    this.app.get('/health', (_req, res) => res.json({ status: 'ok', module: 'knowledge-base' }));
    return new Promise((resolve) => {
      this.server = this.app.listen(DEFAULT_KB_CONFIG.api!.port, () => {
        console.log(`[KnowledgeBase] API: http://localhost:${DEFAULT_KB_CONFIG.api!.port}/api/knowledge`);
        this.running = true;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
    this.running = false;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\sÀ-ÿ]/g, '').split(/\s+/).filter((t) => t.length > 2);
  }
}

export async function createKnowledgeBase(config?: Partial<KnowledgeBaseConfig>): Promise<KnowledgeBaseModule> {
  const mod = new KnowledgeBaseModule(config);
  await mod.initialize();
  return mod;
}