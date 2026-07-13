import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface SkyvernConfig {
  /** Skyvern API URL */
  baseUrl?: string;
  /** API Key */
  apiKey?: string;
}

/**
 * Skyvern Plugin — automação visual de navegador.
 *
 * Utiliza visão computacional para interagir com sites de forma similar a
 * um humano, sem depender de seletores DOM.
 */
export class SkyvernPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'skyvern',
    name: 'Skyvern',
    version: '1.0.0',
    description: 'Automação visual de navegador com IA',
    permissions: ['browser.control', 'network.http', 'ai.access'],
    dependencies: ['browser'],
    commands: ['skyvern.navigate', 'skyvern.extract', 'skyvern.act'],
    events: ['skyvern.task.started', 'skyvern.task.completed', 'skyvern.task.failed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as SkyvernConfig;
    context.log('info', 'Skyvern plugin ativado', {
      baseUrl: config.baseUrl ?? 'not set',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'Skyvern plugin desativado');
  }
}
