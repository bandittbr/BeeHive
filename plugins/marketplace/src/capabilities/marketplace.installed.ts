import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MarketplaceInstalled extends Capability {
  readonly id = 'marketplace.installed';
  readonly name = 'Plugins Instalados';
  readonly description = 'Lista plugins instalados no diretório plugins/';
  readonly inputs: CapabilityInput[] = [];
  readonly outputs: CapabilityOutput[] = [
    { name: 'plugins', type: 'array', description: 'Plugins instalados' },
  ];

  async execute(_params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info('MarketplaceInstalled');

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, {}, ctx);

    // Fallback: listar diretórios com manifest.yaml
    try {
      const pluginsDir = path.join(process.cwd(), 'plugins');
      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
      const plugins: unknown[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const manifestPath = path.join(pluginsDir, entry.name, 'src', 'manifest.yaml');
          const content = await fs.readFile(manifestPath, 'utf-8');
          const name = content.match(/name:\s*(.+)/)?.[1]?.trim() || entry.name;
          const version = content.match(/version:\s*([\d.]+)/)?.[1] || '0.0.0';
          plugins.push({ id: entry.name, name, version });
        } catch { continue; }
      }

      return {
        success: true,
        outputs: { plugins },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: { plugins: [] },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}