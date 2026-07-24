import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { ModulesScan } from './capabilities/modules.scan';
import { ModulesLoad } from './capabilities/modules.load';

export class ModuleLoaderPlugin extends Plugin {
  readonly id = 'plugin:module-loader';
  readonly name = 'Module Loader';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'module-loader',
    version: '1.0.0',
    description: 'Scanner de diretórios — descobre e carrega plugins automaticamente',
    capabilities: ['modules.scan', 'modules.load'],
    adapters: [],
    permissions: ['modules:load', 'modules:scan'],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('ModuleLoaderPlugin activating...');
    ctx.capabilities.register(this.id, new ModulesScan());
    ctx.capabilities.register(this.id, new ModulesLoad());
    ctx.logger.info('ModuleLoaderPlugin activated with 2 capabilities');
  }

  async deactivate(): Promise<void> {}
}