import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class MemorySearch extends Capability {
  readonly id = 'memory.search';
  readonly name = 'Buscar Memória';
  readonly description = 'Busca entradas na memória do projeto';
  readonly inputs: CapabilityInput[] = [
    { name: 'projectId', type: 'string', description: 'ID do projeto', required: false },
    { name: 'type', type: 'string', description: 'Filtrar por tipo', required: false },
    { name: 'tags', type: 'array', description: 'Filtrar por tags', required: false },
    { name: 'limit', type: 'number', description: 'Limite de resultados', required: false, default: 50 },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'entries', type: 'array', description: 'Entradas encontradas' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`MemorySearch: project=${params.projectId}, limit=${params.limit}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: ler do disco
    try {
      const memoryDir = path.join(process.cwd(), 'data', 'memory');
      const projects = params.projectId
        ? [String(params.projectId)]
        : await fs.readdir(memoryDir).catch(() => []);

      const entries: unknown[] = [];
      for (const project of projects) {
        const projectDir = path.join(memoryDir, project);
        try {
          const files = await fs.readdir(projectDir);
          for (const f of files.filter((f) => f.endsWith('.json'))) {
            const entry = JSON.parse(await fs.readFile(path.join(projectDir, f), 'utf-8'));
            if (params.type && entry.type !== params.type) continue;
            if (params.tags && (params.tags as string[]).some((t) => !entry.tags?.includes(t))) continue;
            entries.push(entry);
          }
        } catch { continue; }
      }

      const limit = (params.limit as number) || 50;
      return {
        success: true,
        outputs: { entries: entries.slice(0, limit) },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: true,
        outputs: { entries: [] },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}