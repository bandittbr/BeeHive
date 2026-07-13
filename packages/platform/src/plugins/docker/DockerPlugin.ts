import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface DockerConfig {
  /** Socket do Docker (padrão: /var/run/docker.sock) */
  socketPath?: string;
  /** Host da API Docker */
  host?: string;
  /** Porta da API Docker */
  port?: number;
}

/**
 * Docker Plugin — gerenciamento de containers Docker.
 *
 * Permite criar, iniciar, parar e gerenciar containers Docker para
 * ambientes isolados de execução.
 */
export class DockerPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'docker',
    name: 'Docker',
    version: '1.0.0',
    description: 'Gerenciamento de containers Docker',
    permissions: ['process.exec', 'network.http'],
    dependencies: [],
    commands: ['docker.ps', 'docker.run', 'docker.stop', 'docker.logs', 'docker.build'],
    events: ['docker.container.started', 'docker.container.stopped', 'docker.build.completed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as DockerConfig;
    context.log('info', 'Docker plugin ativado', {
      socketPath: config.socketPath ?? 'default',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'Docker plugin desativado');
  }
}
