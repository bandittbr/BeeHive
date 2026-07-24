import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class MemoryStore extends Capability {
  readonly id = 'memory.store';
  readonly name = 'Armazenar Memória';
  readonly description = 'Armazena entrada na memória do projeto em disco';
  readonly inputs: CapabilityInput[] = [
    { name: 'projectId', type: 'string', description: 'ID do projeto', required: true },
    { name: 'type', type: 'string', description: 'Tipo da entrada (product, campaign, avatar, prompt, result)', required: true },
    { name: 'key', type: 'string', description: 'Chave única da entrada', required: true },
    { name: 'value', type: 'object', description: 'Valor a armazenar', required: true },
    { name: 'tags', type: 'array', description: 'Tags para busca', required: false },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'entryId', type: 'string', description: 'ID da entrada criada' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`MemoryStore: project=${params.projectId}, type=${params.type}, key=${params.key}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: salvar em disco
    try {
      const basePath = path.join(process.cwd(), 'data', 'memory', String(params.projectId));
      await fs.mkdir(basePath, { recursive: true });
      const entry = {
        id: uuidv4(),
        projectId: params.projectId,
        type: params.type,
        key: params.key,
        value: params.value,
        tags: (params.tags as string[]) || [],
        createdAt: new Date().toISOString(),
      };
      await fs.writeFile(path.join(basePath, `${entry.id}.json`), JSON.stringify(entry, null, 2));
      return {
        success: true,
        outputs: { entryId: entry.id },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Erro ao armazenar',
        metrics: { duration: Date.now() - start },
      };
    }
  }
}