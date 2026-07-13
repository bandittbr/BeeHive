import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface HermesConfig {
  /** Hermes API URL */
  baseUrl?: string;
  /** API Key */
  apiKey?: string;
}

/**
 * Hermes Plugin — mensageria e comunicação.
 *
 * Gerencia filas de mensagens, notificações e comunicação entre agentes
 * e serviços. Pode ser usado para integração com sistemas externos.
 */
export class HermesPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'hermes',
    name: 'Hermes',
    version: '1.0.0',
    description: 'Mensageria e comunicação entre agentes',
    permissions: ['network.http', 'eventbus.publish', 'eventbus.subscribe'],
    dependencies: [],
    commands: ['hermes.send', 'hermes.subscribe', 'hermes.queue'],
    events: ['hermes.message.received', 'hermes.queue.ready'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as HermesConfig;
    context.log('info', 'Hermes plugin ativado', {
      baseUrl: config.baseUrl ?? 'not set',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'Hermes plugin desativado');
  }
}
