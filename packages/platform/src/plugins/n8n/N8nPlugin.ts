import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface N8nConfig {
  /** n8n API URL */
  baseUrl?: string;
  /** API Key para autenticação */
  apiKey?: string;
}

/**
 * n8n Plugin — integração com n8n workflows.
 *
 * Permite executar, criar e gerenciar workflows do n8n a partir do BeeHive.
 * Inspiração para o futuro sistema de workflows visuais do BeeHive.
 */
export class N8nPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'n8n',
    name: 'n8n',
    version: '1.0.0',
    description: 'Integração com n8n workflows',
    permissions: ['network.http'],
    dependencies: [],
    commands: ['n8n.execute', 'n8n.list', 'n8n.trigger'],
    events: ['n8n.execution.started', 'n8n.execution.completed', 'n8n.execution.failed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as N8nConfig;
    context.log('info', 'n8n plugin ativado', {
      baseUrl: config.baseUrl ?? 'not set',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'n8n plugin desativado');
  }
}
