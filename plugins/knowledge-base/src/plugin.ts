import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { KnowledgeIndex } from './capabilities/knowledge.index';
import { KnowledgeSearch } from './capabilities/knowledge.search';
import { KnowledgeStats } from './capabilities/knowledge.stats';

export class KnowledgeBasePlugin extends Plugin {
  readonly id = 'plugin:knowledge-base';
  readonly name = 'Knowledge Base';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'knowledge-base',
    version: '1.0.0',
    description: 'RAG com busca full-text em OCR, STT, scripts, produtos, PDFs',
    capabilities: ['knowledge.index', 'knowledge.search', 'knowledge.stats'],
    adapters: [],
    permissions: ['knowledge:read', 'knowledge:write'],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('KnowledgeBasePlugin activating...');
    ctx.capabilities.register(this.id, new KnowledgeIndex());
    ctx.capabilities.register(this.id, new KnowledgeSearch());
    ctx.capabilities.register(this.id, new KnowledgeStats());
    ctx.logger.info('KnowledgeBasePlugin activated with 3 capabilities');
  }

  async deactivate(): Promise<void> {}
}