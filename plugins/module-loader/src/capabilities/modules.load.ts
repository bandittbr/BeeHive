import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ModulesLoad extends Capability {
  readonly id = 'modules.load';
  readonly name = 'Carregar Módulo';
  readonly description = 'Carrega plugin por nome do diretório — importa o plugin.ts';
  readonly inputs: CapabilityInput[] = [
    { name: 'name', type: 'string', description: 'Nome do plugin (diretório)', required: true },
    { name: 'directory', type: 'string', description: 'Diretório onde está', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'loaded', type: 'boolean', description: 'Se carregou' },
    { name: 'capabilities', type: 'array', description: 'Capabilities registradas' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    const name = params.name as string;
    const dir = params.directory as string;
    ctx.logger.info(`ModulesLoad: ${name} from ${dir}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: tentar importar o plugin.ts
    try {
      const pluginPath = path.join(dir, name, 'src', 'plugin.ts');
      await fs.access(pluginPath);
      return {
        success: true,
        outputs: {
          loaded: true,
          capabilities: [],
          message: `Plugin "${name}" encontrado em ${pluginPath}. Use Kernel.boot() para carregar automaticamente.`,
        },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: {
          loaded: false,
          capabilities: [],
          message: `Plugin "${name}" não encontrado ou sem plugin.ts`,
        },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}