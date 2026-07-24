import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ModulesScan extends Capability {
  readonly id = 'modules.scan';
  readonly name = 'Escanear Módulos';
  readonly description = 'Escaneia diretório por plugins disponíveis (que tenham manifest.yaml)';
  readonly inputs: CapabilityInput[] = [
    { name: 'directory', type: 'string', description: 'Diretório para escanear', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'plugins', type: 'array', description: 'Plugins encontrados' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    const dir = params.directory as string;
    ctx.logger.info(`ModulesScan: ${dir}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: escanear diretório
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const plugins: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          await fs.access(path.join(dir, entry.name, 'src', 'manifest.yaml'));
          plugins.push(entry.name);
        } catch {
          try {
            await fs.access(path.join(dir, entry.name, 'manifest.yaml'));
            plugins.push(entry.name);
          } catch { continue; }
        }
      }

      return {
        success: true,
        outputs: { plugins },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: false,
        outputs: { plugins: [] },
        error: error instanceof Error ? error.message : 'Erro ao escanear',
        metrics: { duration: Date.now() - start },
      };
    }
  }
}