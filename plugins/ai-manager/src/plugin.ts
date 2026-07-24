import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { AIComplete } from './capabilities/ai.complete';
import { AIStream } from './capabilities/ai.stream';
import { AIModelsList } from './capabilities/ai.models.list';

export class AIManagerPlugin extends Plugin {
  readonly id = 'plugin:ai-manager';
  readonly name = 'AI Manager';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'ai-manager',
    version: '1.0.0',
    description: 'Gateway unificado de IA — gerencia provedores e modelos',
    capabilities: ['ai.complete', 'ai.stream', 'ai.models.list'],
    adapters: ['OpenAI', 'Anthropic', 'Google', 'Ollama', 'OpenRouter'],
    permissions: ['ai:chat', 'ai:stream'],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('AIManagerPlugin activating...');
    ctx.capabilities.register(this.id, new AIComplete());
    ctx.capabilities.register(this.id, new AIStream());
    ctx.capabilities.register(this.id, new AIModelsList());
    ctx.logger.info('AIManagerPlugin activated with 3 capabilities');
  }

  async deactivate(): Promise<void> {}
}