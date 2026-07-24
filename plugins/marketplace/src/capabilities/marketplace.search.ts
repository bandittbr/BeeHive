import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MarketplaceSearch extends Capability {
  readonly id = 'marketplace.search';
  readonly name = 'Buscar Plugins';
  readonly description = 'Busca plugins no catálogo local';
  readonly inputs: CapabilityInput[] = [
    { name: 'query', type: 'string', description: 'Texto da busca', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'plugins', type: 'array', description: 'Plugins encontrados' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    const q = (params.query as string || '').toLowerCase();
    ctx.logger.info(`MarketplaceSearch: "${q}"`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: escanear diretório plugins/ por manifest.yaml
    try {
      const pluginsDir = path.join(process.cwd(), 'plugins');
      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
      const results: unknown[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const manifestPath = path.join(pluginsDir, entry.name, 'src', 'manifest.yaml');
          const content = await fs.readFile(manifestPath, 'utf-8');
          const name = content.match(/name:\s*(.+)/)?.[1]?.trim() || entry.name;
          const description = content.match(/description:\s*"(.+?)"/)?.[1] || '';
          const capabilities = [...content.matchAll(/-\s*id:\s*(\S+)/g)].map((m) => m[1]);

          if (!q || name.toLowerCase().includes(q) || description.toLowerCase().includes(q) || capabilities.some((c) => c.includes(q))) {
            results.push({ id: entry.name, name, description, capabilities, installed: true });
          }
        } catch { continue; }
      }

      return {
        success: true,
        outputs: { plugins: results },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: true,
        outputs: { plugins: [] },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}