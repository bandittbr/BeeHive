import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class KnowledgeIndex extends Capability {
  readonly id = 'knowledge.index';
  readonly name = 'Indexar Documento';
  readonly description = 'Indexa documento na base de conhecimento com busca full-text';
  readonly inputs: CapabilityInput[] = [
    { name: 'source', type: 'string', description: 'Fonte (ocr, stt, script, pdf, csv, notion)', required: true },
    { name: 'category', type: 'string', description: 'Categoria', required: true },
    { name: 'title', type: 'string', description: 'Título', required: true },
    { name: 'content', type: 'string', description: 'Conteúdo textual', required: true },
    { name: 'metadata', type: 'object', description: 'Metadados adicionais', required: false },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'documentId', type: 'string', description: 'ID do documento indexado' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`KnowledgeIndex: "${params.title}" (${params.category})`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: indexar em disco com índice invertido
    try {
      const basePath = path.join(process.cwd(), 'data', 'knowledge');
      await fs.mkdir(path.join(basePath, 'documents'), { recursive: true });
      await fs.mkdir(path.join(basePath, 'index'), { recursive: true });

      const doc = {
        id: uuidv4(),
        source: params.source,
        category: params.category,
        title: params.title,
        content: params.content,
        metadata: (params.metadata as Record<string, unknown>) || {},
        indexedAt: new Date().toISOString(),
      };

      await fs.writeFile(path.join(basePath, 'documents', `${doc.id}.json`), JSON.stringify(doc, null, 2));

      // Índice invertido simples
      const tokens = (params.content as string).toLowerCase()
        .replace(/[^\w\sÀ-ÿ]/g, '').split(/\s+/).filter((t) => t.length > 2);

      for (const token of [...new Set(tokens)]) {
        const tokenFile = path.join(basePath, 'index', `${token}.json`);
        try {
          const idx = JSON.parse(await fs.readFile(tokenFile, 'utf-8'));
          if (!idx.includes(doc.id)) idx.push(doc.id);
          await fs.writeFile(tokenFile, JSON.stringify(idx));
        } catch {
          await fs.writeFile(tokenFile, JSON.stringify([doc.id]));
        }
      }

      return {
        success: true,
        outputs: { documentId: doc.id },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Erro ao indexar',
        metrics: { duration: Date.now() - start },
      };
    }
  }
}