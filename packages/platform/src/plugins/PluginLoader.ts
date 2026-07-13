import type { ILogger, KernelContext } from '../kernel/types';
import type { PluginContext } from './types';
import { PluginRegistry } from './PluginRegistry';

/**
 * PluginLoader — carregador de plugins para o sistema.
 *
 * Responsabilidade única: instanciar plugins a partir de suas fábricas
 * registradas e ativá-los no PluginManager do Kernel.
 *
 * Suporta carregamento individual, em lote e automático (autoLoad).
 */
export class PluginLoader {
  private readonly registry: PluginRegistry;
  private readonly logger: ILogger;

  constructor(registry: PluginRegistry, logger: ILogger) {
    this.registry = registry;
    this.logger = logger.child('plugin-loader');
  }

  /**
   * Carrega e ativa um único plugin.
   * @param id ID do plugin registrado
   * @param context Contexto do Kernel
   * @param pluginManager PluginManager para registrar o plugin
   */
  async loadOne(
    id: string,
    context: KernelContext,
    pluginManager: { register(plugin: any): void; load(pluginId: string): Promise<void> },
  ): Promise<void> {
    const registration = this.registry.get(id);
    if (!registration) {
      throw new Error(`Plugin não registrado: ${id}`);
    }

    // Cria o contexto do plugin
    const pluginContext: PluginContext = {
      pluginId: registration.id,
      config: registration.defaultConfig || {},
      emit: (event, payload) => context.events.emit(event as any, payload),
      registerCommand: (type, handler) => {
        context.registerCommand(type, (payload, _ctx) => handler(payload));
      },
      getService: (id) => context.getService(id),
      log: (level, message, ctx) => {
        context.logger[level](`[${registration.id}] ${message}`, ctx);
      },
    };

    // Cria a instância do plugin
    const plugin = await registration.factory(pluginContext);

    // Registra no PluginManager do Kernel
    pluginManager.register(plugin);

    // Ativa o plugin
    await pluginManager.load(registration.id);

    this.logger.info(`Plugin carregado e ativado: ${registration.id} v${registration.version}`);
  }

  /**
   * Carrega e ativa múltiplos plugins.
   */
  async loadMany(
    ids: string[],
    context: KernelContext,
    pluginManager: { register(plugin: any): void; load(pluginId: string): Promise<void> },
  ): Promise<void> {
    for (const id of ids) {
      try {
        await this.loadOne(id, context, pluginManager);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'erro desconhecido';
        this.logger.error(`Falha ao carregar plugin: ${id}`, { reason });
      }
    }
  }

  /**
   * Carrega todos os plugins marcados com autoLoad.
   */
  async loadAuto(
    context: KernelContext,
    pluginManager: { register(plugin: any): void; load(pluginId: string): Promise<void> },
  ): Promise<void> {
    const autoIds = this.registry.getAutoLoadIds();
    if (autoIds.length > 0) {
      this.logger.info(`Carregando plugins automáticos: ${autoIds.join(', ')}`);
      await this.loadMany(autoIds, context, pluginManager);
    }
  }
}
