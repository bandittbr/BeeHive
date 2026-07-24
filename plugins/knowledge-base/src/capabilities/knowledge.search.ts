import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class KnowledgeSearch extends Capability {
  readonly id = 'knowledge.search';
  readonly name = 'Buscar Conhecimento';
  readonly description = 'Busca documentos na base de conhecimento por relevância';
  readonly inputs: CapabilityInput[] = [
    { name: 'query', type: 'string', description: 'Texto da busca', required: true },
    { name: 'limit', type: 'number', description: 'Limite de resultados', required: false, default: 10 },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'results', type: 'array', description: 'Resultados ordenados por relevância' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`KnowledgeSearch: "${params.query}"`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: busca no índice invertido
    try {
      const basePath = path.join(process.cwd(), 'data', 'knowledge');
      const tokens = (params.query as string).toLowerCase()
        .replace(/[^\w\sÀ-ÿ]/g, '').split(/\s+/).filter((t) => t.length > 2);

      const scores = new Map<string, number>();
      for (const token of tokens) {
        try {
          const ids = JSON.parse(await fs.readFile(path.join(basePath, 'index', `${token}.json`), 'utf-8'));
          for (const id of ids) scores.set(id, (scores.get(id) || 0) + 1);
        } catch { continue; }
      }

      const limit = (params.limit as number) || 10;
      const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
      const results: unknown[] = [];

      for (const [docId, score] of sorted) {
        try {
          const doc = JSON.parse(await fs.readFile(path.join(basePath, 'documents', `${docId}.json`), 'utf-8'));
          results.push({ document: doc, score: score / tokens.length });
        } catch { continue; }
      }

      return {
        success: true,
        outputs: { results },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: { results: [] },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}