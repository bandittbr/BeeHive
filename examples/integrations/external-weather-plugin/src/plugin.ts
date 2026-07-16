import { Plugin } from '@beehive/sdk';
import type { PluginContext } from '@beehive/sdk';
import { weatherCapability } from './weather.capability';

export class WeatherPlugin extends Plugin {
  id = 'external-weather';
  name = 'Weather Plugin';
  version = '1.0.0';
  manifest = { id: 'external-weather', name: 'Weather Plugin', version: '1.0.0', capabilities: ['weather.current'], adapters: [], permissions: [] };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.registerCapability(weatherCapability);
  }

  async deactivate(): Promise<void> {
  }
}
