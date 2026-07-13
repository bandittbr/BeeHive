import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface ArcReelConfig {
  /** Pipeline de roteiro ativo */
  scriptPipeline?: string;
  /** Diretório de exportação de projetos */
  exportDir?: string;
}

/**
 * ArcReel Plugin — pipeline de criação de vídeo.
 *
 * Adapta conceitos do ArcReel para o BeeHive: pipeline de roteiro, storyboard,
 * consistência visual e exportação de projetos. O BeeHive mantém o controle
 * de todo o fluxo.
 */
export class ArcReelPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'arc_reel',
    name: 'ArcReel',
    version: '1.0.0',
    description: 'Pipeline de criação de vídeo (roteiro, storyboard, exportação)',
    permissions: ['filesystem.read', 'filesystem.write', 'ai.access'],
    dependencies: [],
    commands: ['arc_reel.script', 'arc_reel.storyboard', 'arc_reel.export'],
    events: ['arc_reel.script.created', 'arc_reel.storyboard.ready', 'arc_reel.export.completed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as ArcReelConfig;
    context.log('info', 'ArcReel plugin ativado', {
      scriptPipeline: config.scriptPipeline ?? 'default',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'ArcReel plugin desativado');
  }
}
