import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { MemoryStore } from './capabilities/memory.store';
import { MemorySearch } from './capabilities/memory.search';
import { MemoryGet } from './capabilities/memory.get';
import { MemoryDelete } from './capabilities/memory.delete';

export class MemoryPlugin extends Plugin {
  readonly id = 'plugin:memory';
  readonly name = 'Memory';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'memory',
    version: '1.0.0',
    description: 'Memória persistente por projeto — produtos, campanhas, avatares, prompts',
    capabilities: ['memory.store', 'memory.search', 'memory.get', 'memory.delete'],
    adapters: [],
    permissions: ['memory:read', 'memory:write'],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('MemoryPlugin activating...');
    ctx.capabilities.register(this.id, new MemoryStore());
    ctx.capabilities.register(this.id, new MemorySearch());
    ctx.capabilities.register(this.id, new MemoryGet());
    ctx.capabilities.register(this.id, new MemoryDelete());
    ctx.logger.info('MemoryPlugin activated with 4 capabilities');
  }

  async deactivate(): Promise<void> {}
}