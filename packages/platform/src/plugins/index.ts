/**
 * Plugin System do BeeHive.
 *
 * Sistema universal de plugins com manifesto, configurações, permissões,
 * versão, dependências, comandos disponíveis e eventos suportados.
 *
 * Plugins são unidades de extensibilidade de terceiros, instaláveis
 * dinamicamente. Diferente dos módulos (partes estruturais do sistema),
 * plugins são opcionais.
 */

export { BasePlugin } from './BasePlugin';
export { PluginRegistry } from './PluginRegistry';
export { PluginLoader } from './PluginLoader';
export * from './types';

// Plugins específicos
export { PlaywrightPlugin } from './playwright';
export type { PlaywrightConfig } from './playwright';

export { BrowserPlugin } from './browser';
export type { BrowserPluginConfig } from './browser';

export { DockerPlugin } from './docker';
export type { DockerConfig } from './docker';

export { GitPlugin } from './git';
export type { GitConfig } from './git';

export { OllamaPlugin } from './ollama';
export type { OllamaConfig } from './ollama';

export { N8nPlugin } from './n8n';
export type { N8nConfig } from './n8n';

export { SkyvernPlugin } from './skyvern';
export type { SkyvernConfig } from './skyvern';

export { ArcReelPlugin } from './arc_reel';
export type { ArcReelConfig } from './arc_reel';

export { HermesPlugin } from './hermes';
export type { HermesConfig } from './hermes';

export { GitHubPlugin } from './github';
export type { GitHubConfig } from './github';
