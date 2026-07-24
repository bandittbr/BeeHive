import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MemoryDelete extends Capability {
  readonly id = 'memory.delete';
  readonly name = 'Remover Memória';
  readonly description = 'Remove entrada da memória';
  readonly inputs: CapabilityInput[] = [
    { name: 'entryId', type: 'string', description: 'ID da entrada', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'success', type: 'boolean', description: 'Se foi removido' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`MemoryDelete: entryId=${params.entryId}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: remover do disco
    try {
      const memoryDir = path.join(process.cwd(), 'data', 'memory');
      const projects = await fs.readdir(memoryDir).catch(() => []);
      for (const project of projects) {
        try {
          await fs.unlink(path.join(memoryDir, project, `${params.entryId}.json`));
          return {
            success: true,
            outputs: { success: true },
            metrics: { duration: Date.now() - start },
          };
        } catch { continue; }
      }
      return {
        success: true,
        outputs: { success: false },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: { success: false },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}