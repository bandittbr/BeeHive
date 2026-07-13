import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface GitConfig {
  /** Nom du user pour les commits */
  userName?: string;
  /** Email du user pour les commits */
  userEmail?: string;
  /** Chemin par défaut du répertoire de travail */
  defaultWorkDir?: string;
}

/**
 * Git Plugin — opérations Git.
 *
 * Permet de cloner, commit, push, pull, créer des branches et gérer
 * des dépôts Git directement depuis le système.
 */
export class GitPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'git',
    name: 'Git',
    version: '1.0.0',
    description: 'Opérations Git (clone, commit, push, pull, branches)',
    permissions: ['filesystem.read', 'filesystem.write', 'process.exec'],
    dependencies: [],
    commands: ['git.clone', 'git.commit', 'git.push', 'git.pull', 'git.branch', 'git.log'],
    events: ['git.commit.created', 'git.push.completed', 'git.branch.created'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as GitConfig;
    context.log('info', 'Git plugin ativado', {
      userName: config.userName ?? 'not set',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'Git plugin desativado');
  }
}
