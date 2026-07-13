import { BasePlugin } from '../BasePlugin';
import type { PluginContext, PluginManifest } from '../types';

export interface OllamaConfig {
  /** Ollama API URL (padrão: http://localhost:11434) */
  baseUrl?: string;
  /** Modelo padrão a ser usado */
  defaultModel?: string;
  /** Tempo máximo de espera para respostas (ms) */
  timeout?: number;
}

/**
 * Ollama Plugin — modelos de IA locais via Ollama.
 *
 * Permite executar modelos de linguagem localmente (Llama, Mistral, etc.)
 * sem depender de APIs externas.
 */
export class OllamaPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    id: 'ollama',
    name: 'Ollama',
    version: '1.0.0',
    description: 'Modelos de IA locais via Ollama',
    permissions: ['network.http', 'ai.access'],
    dependencies: [],
    commands: ['ollama.list', 'ollama.pull', 'ollama.chat', 'ollama.embed'],
    events: ['ollama.model.pulled', 'ollama.model.removed'],
  };

  protected async onActivate(context: PluginContext): Promise<void> {
    const config = this.config as OllamaConfig;
    context.log('info', 'Ollama plugin ativado', {
      baseUrl: config.baseUrl ?? 'http://localhost:11434',
      defaultModel: config.defaultModel ?? 'llama3',
    });
  }

  protected async onDeactivate(context: PluginContext): Promise<void> {
    context.log('info', 'Ollama plugin desativado');
  }
}
