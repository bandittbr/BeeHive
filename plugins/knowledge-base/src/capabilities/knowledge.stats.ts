import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class KnowledgeStats extends Capability {
  readonly id = 'knowledge.stats';
  readonly name = 'Estatísticas da Base';
  readonly description = 'Estatísticas da base de conhecimento';
  readonly inputs: CapabilityInput[] = [];
  readonly outputs: CapabilityOutput[] = [
    { name: 'totalDocuments', type: 'number', description: 'Total de documentos' },
    { name: 'totalTokens', type: 'number', description: 'Total de tokens indexados' },
  ];

  async execute(_params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info('KnowledgeStats');

    try {
      const basePath = path.join(process.cwd(), 'data', 'knowledge');
      const docs = await fs.readdir(path.join(basePath, 'documents')).catch(() => []);
      const idx = await fs.readdir(path.join(basePath, 'index')).catch(() => []);
      return {
        success: true,
        outputs: { totalDocuments: docs.length, totalTokens: idx.length },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: { totalDocuments: 0, totalTokens: 0 },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}