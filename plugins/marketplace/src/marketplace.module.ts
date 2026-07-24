// ============================================================================
// Marketplace :: Module
// ============================================================================
// Loja de plugins com servidor REST.
// ============================================================================

import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createRouter } from './api/routes';

export interface MarketplacePluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  manifest: Record<string, unknown>;
  publishedAt: string;
}

export interface MarketplaceConfig {
  storagePath?: string;
  pluginsDir?: string;
  api?: { port: number; cors: boolean };
}

export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  storagePath: path.join(process.cwd(), 'data', 'marketplace'),
  pluginsDir: path.join(process.cwd(), 'plugins'),
  api: { port: 3099, cors: true },
};

export class MarketplaceModule {
  private catalog = new Map<string, MarketplacePluginInfo>();
  private installed = new Map<string, MarketplacePluginInfo>();
  private storagePath: string;
  private pluginsDir: string;
  private app = express();
  private server: ReturnType<typeof express.application.listen> | null = null;
  private running = false;

  constructor(config?: Partial<MarketplaceConfig>) {
    const cfg = { ...DEFAULT_MARKETPLACE_CONFIG, ...config };
    this.storagePath = cfg.storagePath!;
    this.pluginsDir = cfg.pluginsDir!;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    try {
      const data = await fs.readFile(path.join(this.storagePath, 'catalog.json'), 'utf-8');
      const catalog: MarketplacePluginInfo[] = JSON.parse(data);
      for (const p of catalog) this.catalog.set(p.id, p);
    } catch { /* empty */ }
  }

  async install(pluginId: string): Promise<boolean> {
    const plugin = this.catalog.get(pluginId);
    if (!plugin || this.installed.has(pluginId)) return false;
    const targetDir = path.join(this.pluginsDir, pluginId);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'manifest.yaml'), JSON.stringify(plugin.manifest, null, 2));
    this.installed.set(pluginId, plugin);
    return true;
  }

  async uninstall(pluginId: string): Promise<boolean> {
    if (!this.installed.has(pluginId)) return false;
    await fs.rm(path.join(this.pluginsDir, pluginId), { recursive: true, force: true });
    this.installed.delete(pluginId);
    return true;
  }

  async publish(plugin: MarketplacePluginInfo): Promise<void> {
    this.catalog.set(plugin.id, plugin);
    await this.persist();
  }

  async unpublish(pluginId: string): Promise<void> {
    this.catalog.delete(pluginId);
    await this.persist();
  }

  search(query: string): MarketplacePluginInfo[] {
    const q = query.toLowerCase();
    return Array.from(this.catalog.values()).filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags?.some((t) => t.includes(q)),
    );
  }

  getInstalled(): MarketplacePluginInfo[] {
    return Array.from(this.installed.values());
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.initialize();
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/api/marketplace', createRouter());
    this.app.get('/health', (_req, res) => res.json({ status: 'ok', module: 'marketplace' }));
    return new Promise((resolve) => {
      this.server = this.app.listen(DEFAULT_MARKETPLACE_CONFIG.api!.port, () => {
        console.log(`[Marketplace] API: http://localhost:${DEFAULT_MARKETPLACE_CONFIG.api!.port}/api/marketplace`);
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
    await fs.writeFile(path.join(this.storagePath, 'catalog.json'), JSON.stringify(Array.from(this.catalog.values()), null, 2));
  }
}

export async function createMarketplace(config?: Partial<MarketplaceConfig>): Promise<MarketplaceModule> {
  const mod = new MarketplaceModule(config);
  await mod.initialize();
  return mod;
}