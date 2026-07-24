import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { ChatGenerate } from './capabilities/chat.generate';
import { MemorySearch } from './capabilities/memory.search';
import { ToolExecute } from './capabilities/tool.execute';

export class FoundationPlugin extends Plugin {
  readonly id = 'plugin:foundation';
  readonly name = 'Foundation';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'foundation', version: '1.0.0', description: 'Plugin base do BeeHive',
    capabilities: ['chat.generate', 'memory.search', 'tool.execute'],
    adapters: ['OpenRouter', 'OpenAI', 'Ollama'],
    permissions: ['ai:chat', 'ai:stream', 'memory:read', 'memory:write'],
  };



  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('FoundationPlugin activating...');

    const chatGen = new ChatGenerate();
    const memSearch = new MemorySearch();
    const toolExec = new ToolExecute();

    ctx.capabilities.register(this.id, chatGen);
    ctx.capabilities.register(this.id, memSearch);
    ctx.capabilities.register(this.id, toolExec);

    ctx.logger.info('FoundationPlugin activated with 3 capabilities');
  }

  async deactivate(): Promise<void> {
    // Cleanup
  }
}
