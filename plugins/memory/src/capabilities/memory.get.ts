import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MemoryGet extends Capability {
  readonly id = 'memory.get';
  readonly name = 'Obter Memória';
  readonly description = 'Obtém entrada específica da memória';
  readonly inputs: CapabilityInput[] = [
    { name: 'entryId', type: 'string', description: 'ID da entrada', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'entry', type: 'object', description: 'Entrada da memória' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`MemoryGet: entryId=${params.entryId}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: buscar no disco
    try {
      const memoryDir = path.join(process.cwd(), 'data', 'memory');
      const projects = await fs.readdir(memoryDir).catch(() => []);
      for (const project of projects) {
        try {
          const entry = JSON.parse(
            await fs.readFile(path.join(memoryDir, project, `${params.entryId}.json`), 'utf-8'),
          );
          return {
            success: true,
            outputs: { entry },
            metrics: { duration: Date.now() - start },
          };
        } catch { continue; }
      }
      return {
        success: true,
        outputs: { entry: null },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: true,
        outputs: { entry: null },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}