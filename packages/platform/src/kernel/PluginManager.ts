import type { ILogger, IPlugin, IPluginManager, KernelContext } from './types';

/**
 * PluginManager — sistema universal de plugins do Kernel.
 *
 * Responsabilidade única: gerenciar o ciclo de vida de plugins (registro,
 * carga, ativação, desativação, descarte). Cada plugin possui manifesto,
 * configurações, permissões, versão, dependências, comandos disponíveis
 * e eventos suportados.
 *
 * O PluginManager é separado do ModuleManager porque plugins são
 * unidades de extensibilidade de TERCEIROS (instaláveis dinamicamente),
 * enquanto módulos são partes ESTRUTURAIS do sistema.
 *
 * Plugins previstos: playwright, browser, docker, git, ollama, n8n,
 * skyvern, arc_reel, hermes, github.
 */
export class PluginManager implements IPluginManager {
  private readonly plugins = new Map<string, IPlugin>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child('plugins');
  }

  register(plugin: IPlugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin já registrado: ${plugin.manifest.id}`);
    }
    this.plugins.set(plugin.manifest.id, plugin);
    this.logger.info(`Plugin registrado: ${plugin.manifest.name} v${plugin.manifest.version}`, {
      id: plugin.manifest.id,
      permissions: plugin.manifest.permissions,
      dependencies: plugin.manifest.dependencies,
    });
  }

  async load(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin não encontrado: ${pluginId}`);

    try {
      await plugin.activate({} as KernelContext);
      this.logger.info(`Plugin ativado: ${plugin.manifest.name}`, { id: pluginId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Plugin falhou ao ativar: ${plugin.manifest.name}`, {
        id: pluginId,
        reason,
      });
      throw error;
    }
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin não encontrado: ${pluginId}`);

    try {
      await plugin.deactivate({} as KernelContext);
      this.logger.info(`Plugin desativado: ${plugin.manifest.name}`, { id: pluginId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Plugin falhou ao desativar: ${plugin.manifest.name}`, {
        id: pluginId,
        reason,
      });
    }
  }

  async dispose(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin não encontrado: ${pluginId}`);

    try {
      await plugin.dispose({} as KernelContext);
      this.plugins.delete(pluginId);
      this.logger.info(`Plugin descartado: ${plugin.manifest.name}`, { id: pluginId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Plugin falhou ao descartar: ${plugin.manifest.name}`, {
        id: pluginId,
        reason,
      });
    }
  }

  get(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  list(): readonly IPlugin[] {
    return [...this.plugins.values()];
  }

  active(): readonly IPlugin[] {
    return [...this.plugins.values()].filter(
      (p) => p.state === 'Active' || p.state === 'Loaded',
    );
  }
}
