import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { MarketplaceSearch } from './capabilities/marketplace.search';
import { MarketplaceInstall } from './capabilities/marketplace.install';
import { MarketplaceUninstall } from './capabilities/marketplace.uninstall';
import { MarketplaceInstalled } from './capabilities/marketplace.installed';

export class MarketplacePlugin extends Plugin {
  readonly id = 'plugin:marketplace';
  readonly name = 'Marketplace';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'marketplace',
    version: '1.0.0',
    description: 'Loja de plugins — instala, desinstala, publica plugins do BeeHive',
    capabilities: ['marketplace.search', 'marketplace.install', 'marketplace.uninstall', 'marketplace.installed'],
    adapters: [],
    permissions: ['marketplace:install', 'marketplace:uninstall'],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('MarketplacePlugin activating...');
    ctx.capabilities.register(this.id, new MarketplaceSearch());
    ctx.capabilities.register(this.id, new MarketplaceInstall());
    ctx.capabilities.register(this.id, new MarketplaceUninstall());
    ctx.capabilities.register(this.id, new MarketplaceInstalled());
    ctx.logger.info('MarketplacePlugin activated with 4 capabilities');
  }

  async deactivate(): Promise<void> {}
}