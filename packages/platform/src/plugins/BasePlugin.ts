import type { IPlugin, KernelContext, PluginManifest, PluginState } from '../kernel/types';
import type { PluginConfigOptions, PluginContext, PluginHealth, PluginSnapshot } from './types';

/**
 * BasePlugin — classe base para todos os plugins do BeeHive.
 *
 * Fornece implementações padrão para o ciclo de vida, gerenciamento de estado,
 * e integração com o PluginManager do Kernel. Cada plugin concreto deve
 * estender esta classe e implementar os métodos abstratos.
 *
 * Plugins previstos: playwright, browser, docker, git, ollama, n8n, skyvern,
 * arc_reel, hermes, github.
 */
export abstract class BasePlugin implements IPlugin {
  abstract readonly manifest: PluginManifest;

  protected _state: PluginState = 'Registered';
  protected _lastError: string | null = null;
  protected _startedAt: number | null = null;
  protected _config: PluginConfigOptions = {};
  protected _context: PluginContext | null = null;

  get state(): PluginState {
    return this._state;
  }

  get config(): PluginConfigOptions {
    return this._config;
  }

  /**
   * Ativa o plugin. Chamado pelo PluginManager quando o plugin é carregado.
   * Configura o contexto, valida permissões e chama o hook onActivate().
   */
  async activate(context: KernelContext): Promise<void> {
    if (this._state === 'Active') return;

    try {
      this._state = 'Loading';
      this._config = this.getConfig(context);

      this._context = this.createPluginContext(context);

      await this.onBeforeActivate(this._context);
      await this.onActivate(this._context);
      this._state = 'Active';
      this._startedAt = Date.now();
      context.logger.info(`Plugin ativado: ${this.manifest.name} v${this.manifest.version}`);
    } catch (error) {
      this._state = 'Failed';
      this._lastError = error instanceof Error ? error.message : 'erro desconhecido';
      context.logger.error(`Plugin falhou ao ativar: ${this.manifest.name}`, {
        error: this._lastError,
      });
      throw error;
    }
  }

  /**
   * Desativa o plugin. Chamado pelo PluginManager quando o plugin é descarregado.
   */
  async deactivate(context: KernelContext): Promise<void> {
    if (this._state === 'Inactive') return;

    try {
      const ctx = this._context || this.createPluginContext(context);
      await this.onDeactivate(ctx);
      this._state = 'Inactive';
      this._startedAt = null;
      context.logger.info(`Plugin desativado: ${this.manifest.name}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      context.logger.error(`Plugin falhou ao desativar: ${this.manifest.name}`, { reason });
    }
  }

  /**
   * Descartar o plugin. Chamado pelo PluginManager quando o plugin é removido.
   */
  async dispose(context: KernelContext): Promise<void> {
    if (this._state === 'Disposed') return;

    try {
      const ctx = this._context || this.createPluginContext(context);
      await this.onDispose(ctx);
      this._state = 'Disposed';
      this._startedAt = null;
      this._context = null;
      context.logger.info(`Plugin descartado: ${this.manifest.name}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      context.logger.error(`Plugin falhou ao descartar: ${this.manifest.name}`, { reason });
    }
  }

  // ---------------------------------------------------------------------------
  // Hooks — subclasses devem sobrescrever
  // ---------------------------------------------------------------------------

  /** Chamado antes da ativação (validação de dependências, etc.) */
  protected onBeforeActivate(_context: PluginContext): void | Promise<void> {}

  /** Chamado durante a ativação (inicialização do plugin) */
  protected abstract onActivate(context: PluginContext): void | Promise<void>;

  /** Chamado durante a desativação (liberação de recursos) */
  protected onDeactivate(_context: PluginContext): void | Promise<void> {}

  /** Chamado durante o descarte (limpeza final) */
  protected onDispose(_context: PluginContext): void | Promise<void> {}

  // ---------------------------------------------------------------------------
  // Utilitários para subclasses
  // ---------------------------------------------------------------------------

  /** Cria o contexto do plugin a partir do KernelContext */
  protected createPluginContext(context: KernelContext): PluginContext {
    return {
      pluginId: this.manifest.id,
      config: this._config,
      emit: (event, payload) => context.events.emit(event as any, payload),
      registerCommand: (type, handler) => {
        context.registerCommand(type, (payload, _ctx) => handler(payload));
      },
      getService: (id) => context.getService(id),
      log: (level, message, ctx) => {
        context.logger[level](`[${this.manifest.id}] ${message}`, ctx);
      },
    };
  }

  /** Lê a configuração do plugin a partir do ConfigurationManager */
  protected getConfig(context: KernelContext): PluginConfigOptions {
    const configKey = `plugins.${this.manifest.id}`;
    return (context.config.get(configKey) as PluginConfigOptions) || {};
  }

  /** Verifica se uma permissão está declarada no manifesto */
  protected hasPermission(permission: string): boolean {
    return this.manifest.permissions.includes(permission as any);
  }

  /** Verifica se uma dependência está declarada no manifesto */
  protected hasDependency(dependency: string): boolean {
    return this.manifest.dependencies.includes(dependency);
  }

  // ---------------------------------------------------------------------------
  // Observabilidade
  // ---------------------------------------------------------------------------

  /** Retorna a saúde do plugin */
  health(): PluginHealth {
    return {
      ok: this._state !== 'Failed',
      detail: this._lastError ?? undefined,
    };
  }

  /** Retorna um snapshot do plugin */
  snapshot(): PluginSnapshot {
    return {
      manifest: this.manifest,
      state: this._state,
      active: this._state === 'Active',
      uptimeMs: this._startedAt !== null ? Date.now() - this._startedAt : null,
      lastError: this._lastError,
      health: this.health(),
    };
  }
}
