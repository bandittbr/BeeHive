// ============================================================================
// Module Loader :: Module
// ============================================================================
// Scanner de diretórios com servidor REST.
// ============================================================================

import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createRouter } from './api/routes';

export interface ModuleManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: Array<{ id: string; description: string }>;
  adapters: string[];
  dependencies: string[];
  permissions: string[];
}

export interface ModuleLoaderConfig {
  api?: { port: number; cors: boolean };
}

export const DEFAULT_MODULE_LOADER_CONFIG: ModuleLoaderConfig = {
  api: { port: 3100, cors: true },
};

export class ModuleLoaderModule {
  private loaded = new Map<string, unknown>();
  private app = express();
  private server: ReturnType<typeof express.application.listen> | null = null;
  private running = false;

  async scan(directory: string): Promise<string[]> {
    const plugins: string[] = [];
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            await fs.access(path.join(directory, entry.name, 'src', 'manifest.yaml'));
            plugins.push(entry.name);
          } catch {
            try {
              await fs.access(path.join(directory, entry.name, 'manifest.yaml'));
              plugins.push(entry.name);
            } catch { continue; }
          }
        }
      }
    } catch { /* empty */ }
    return plugins;
  }

  async loadManifest(pluginName: string, directory: string): Promise<ModuleManifest | null> {
    try {
      const manifestPath = path.join(directory, pluginName, 'src', 'manifest.yaml');
      const content = await fs.readFile(manifestPath, 'utf-8');
      return this.parseYaml(content);
    } catch {
      try {
        const manifestPath = path.join(directory, pluginName, 'manifest.yaml');
        const content = await fs.readFile(manifestPath, 'utf-8');
        return this.parseYaml(content);
      } catch { return null; }
    }
  }

  isLoaded(name: string): boolean { return this.loaded.has(name); }
  markLoaded(name: string, instance: unknown): void { this.loaded.set(name, instance); }
  unload(name: string): void { this.loaded.delete(name); }
  getLoaded(): string[] { return Array.from(this.loaded.keys()); }

  async start(): Promise<void> {
    if (this.running) return;
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/api/modules', createRouter());
    this.app.get('/health', (_req, res) => res.json({ status: 'ok', module: 'module-loader' }));
    return new Promise((resolve) => {
      this.server = this.app.listen(DEFAULT_MODULE_LOADER_CONFIG.api!.port, () => {
        console.log(`[ModuleLoader] API: http://localhost:${DEFAULT_MODULE_LOADER_CONFIG.api!.port}/api/modules`);
        this.running = true;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
    this.running = false;
  }

  private parseYaml(raw: string): ModuleManifest {
    const result: any = {};
    const lines = raw.split('\n');
    let currentKey: string | null = null;
    let currentArr: any[] | null = null;
    for (const line of lines) {
      if (line.includes(':') && !line.trimStart().startsWith('-')) {
        if (currentArr && currentKey) { result[currentKey] = currentArr; currentArr = null; }
        const colonIdx = line.indexOf(':');
        const key = line.slice(0, colonIdx).trim();
        let val: any = line.slice(colonIdx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val === '') { currentKey = key; currentArr = []; }
        else { result[key] = val; currentKey = null; }
      } else if (line.trimStart().startsWith('- ') && currentKey) {
        const item = line.trim().slice(2).trim();
        if (item.includes(':')) {
          const obj: any = {};
          const parts = item.split(/\s*:\s*/);
          if (parts.length >= 2) obj[parts[0]] = parts.slice(1).join(':');
          if (currentArr) currentArr.push(obj);
        } else { if (currentArr) currentArr.push(item); }
      }
    }
    if (currentArr && currentKey) result[currentKey] = currentArr;
    return result as ModuleManifest;
  }
}

export async function createModuleLoader(): Promise<ModuleLoaderModule> {
  return new ModuleLoaderModule();
}