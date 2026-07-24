import { Kernel } from '../Kernel';
import type { PluginManifest } from '@beehive/shared';
import type { IPlugin } from '@beehive/shared';

interface DiskManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: Array<{ id: string; description: string; inputs?: unknown[]; outputs?: unknown[] }>;
  adapters: string[];
  dependencies: string[];
  permissions: string[];
}

export class PluginRegistry {
  private plugins = new Map<string, { manifest: PluginManifest; instance: IPlugin }>();
  constructor(private kernel: Kernel) {}

  async discoverAndActivate(): Promise<Array<{ id: string; status: 'activated' | 'failed'; error?: string }>> {
    const results: Array<{ id: string; status: 'activated' | 'failed'; error?: string }> = [];
    const fs = await import('fs');
    const path = await import('path');

    const pluginsDir = path.join(process.cwd(), 'plugins');
    if (!fs.existsSync(pluginsDir)) return results;

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const pluginDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    for (const dirName of pluginDirs) {
      const manifestPath = path.join(pluginsDir, dirName, 'src', 'manifest.yaml');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const yamlRaw = fs.readFileSync(manifestPath, 'utf-8');
        const diskManifest = this.parseYaml(yamlRaw);
        const pluginManifest: PluginManifest = {
          name: diskManifest.name,
          version: diskManifest.version,
          description: diskManifest.description,
          author: diskManifest.author,
          capabilities: diskManifest.capabilities.map((c: { id: string }) => c.id),
          adapters: diskManifest.adapters ?? [],
          permissions: diskManifest.permissions ?? [],
        };

        const pluginPath = path.join(pluginsDir, dirName, 'src', 'plugin.ts');
        const pluginUrl = new URL('file://' + pluginPath.replace(/\\/g, '/')).href;
        const mod = await import(pluginUrl);
        const PluginClass = mod[Object.keys(mod).find(k => k.endsWith('Plugin')) ?? Object.keys(mod)[0]];
        if (!PluginClass) throw new Error('No plugin class found');

        const instance: IPlugin = new PluginClass() as IPlugin;

        const ctx = this.kernel.createPluginContext(pluginManifest.name);
        await instance.activate(ctx);

        this.plugins.set(instance.id, { manifest: pluginManifest, instance });
        results.push({ id: instance.id, status: 'activated' });
      } catch (err: any) {
        results.push({ id: dirName, status: 'failed', error: err.message });
      }
    }
    return results;
  }

  register(id: string, manifest: PluginManifest, instance: any): void {
    this.plugins.set(id, { manifest, instance });
  }

  get<T = any>(id: string): T | undefined { return this.plugins.get(id)?.instance as T; }
  list(): string[] { return Array.from(this.plugins.keys()); }
  isLoaded(id: string): boolean { return this.plugins.has(id); }

  private parseYaml(raw: string): DiskManifest {
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
        } else {
          if (currentArr) currentArr.push(item);
        }
      } else if (line.trim().startsWith('- {') && currentKey) {
        const jsonStr = line.trim().slice(2).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (currentArr) currentArr.push(parsed);
        } catch { /* skip */ }
      } else if (line.trimStart().startsWith('-')) {
        if (currentArr) currentArr.push(line.trim().slice(1).trim());
      }
    }
    if (currentArr && currentKey) result[currentKey] = currentArr;
    return result as DiskManifest;
  }
}
