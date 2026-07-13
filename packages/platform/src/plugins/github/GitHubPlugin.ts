import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface GitHubConfig {
  /** GitHub API URL (padrão: https://api.github.com) */
  baseUrl?: string;
  /** Token de acesso pessoal */
  token?: string;
  /** Nome do usuário/repositório padrão */
  defaultRepo?: string;
}

/**
 * GitHub Plugin — integração com GitHub.
 *
 * Permite gerenciar repositórios, issues, pull requests, ações e releases
 * diretamente do BeeHive.
 */
export class GitHubPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'github',
    name: 'GitHub',
    version: '1.0.0',
    description: 'Integração com GitHub (repos, issues, PRs, actions)',
    permissions: ['network.http'],
    dependencies: ['git'],
    commands: ['github.issues.list', 'github.pr.create', 'github.actions.run', 'github.releases.list'],
    events: ['github.issue.created', 'github.pr.merged', 'github.action.completed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as GitHubConfig;
    context.log('info', 'GitHub plugin ativado', {
      baseUrl: config.baseUrl ?? 'https://api.github.com',
      defaultRepo: config.defaultRepo ?? 'not set',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'GitHub plugin desativado');
  }
}
