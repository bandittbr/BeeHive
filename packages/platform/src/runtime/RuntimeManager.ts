import { bootstrapKernel } from '../kernel';
import { ModuleManager, MODULE_MANIFEST } from '../modules';
import { ServiceManager } from '../services';
import { AIManager, ProviderManager, createOllamaProvider } from '../ai';
import { ToolManager, ToolRegistry, TOOL_MANIFEST } from '../tools';
import { AI_MANAGER_ID, TOOL_MANAGER_ID } from './ids';
import { RuntimeLifecycle } from './RuntimeLifecycle';
import type {
  ComponentHealth,
  RuntimeContext,
  RuntimeHealth,
  RuntimeSnapshot,
  RuntimeStatus,
} from './types';

/**
 * Reexportados aqui por compatibilidade — quem já importava `AI_MANAGER_ID`/
 * `TOOL_MANAGER_ID` de `./RuntimeManager` continua funcionando. O VALOR real
 * mora em `./ids` (zero imports — ver o porquê lá).
 */
export { AI_MANAGER_ID, TOOL_MANAGER_ID };

/**
 * BeeHive Runtime — executa todo o Sistema Operacional.
 *
 * Dá boot no Kernel e conduz o ciclo de vida ordenado de Tools, Providers (AI),
 * Services, Modules e (futuros) Agents. Expõe status, health, snapshot e logs
 * para clientes (Web/Desktop). É agnóstico de ambiente: o MESMO código roda no
 * backend (Node), num processo desktop ou no navegador.
 */
export class RuntimeManager {
  private _status: RuntimeStatus = 'Boot';
  private _startedAt: number | null = null;
  private _lastError: string | null = null;
  private _context: RuntimeContext | null = null;
  private lifecycle: RuntimeLifecycle | null = null;

  get status(): RuntimeStatus {
    return this._status;
  }

  get context(): RuntimeContext {
    if (!this._context) {
      throw new Error('Runtime não iniciado. Chame start() primeiro.');
    }
    return this._context;
  }

  /** Inicializa e coloca todo o sistema em execução (Startup ordenado). */
  async start(): Promise<void> {
    if (this._status === 'Running') return;
    try {
      // Boot: o Kernel primeiro (tudo o mais depende dele).
      this._status = 'Boot';
      const kernel = bootstrapKernel();
      const logger = kernel.context.logger.child('runtime');

      // Loading: compõe a plataforma (sem ainda iniciar módulos/serviços).
      this._status = 'Loading';
      const toolRegistry = new ToolRegistry();
      const toolManager = new ToolManager({
        registry: toolRegistry,
        logger: kernel.context.logger,
        events: kernel.context.events,
      });
      // ProviderManager no lugar do AIProviderRegistry simples: mesma gestão
      // (registro/ativação/Provider e modelo padrão) que já existia como
      // infraestrutura pronta (Sprint 13.3) — só passa a ser o que o Runtime
      // efetivamente instancia e injeta no AIManager. `ProviderManager` É um
      // `AIProviderRegistry` (herança), então o campo `aiRegistry` do
      // `RuntimeContext` (tipado como `AIProviderRegistry`) não muda. O
      // EventBus é injetado (Sprint 14.3) para que trocas de Provider ativo
      // emitam `ProviderChanged`.
      const providerManager = new ProviderManager({
        logger: kernel.context.logger,
        events: kernel.context.events,
      });
      providerManager.register(createOllamaProvider({ logger: kernel.context.logger }));
      const aiManager = new AIManager({
        registry: providerManager,
        logger: kernel.context.logger.child('ai'),
        toolExecutor: toolManager,
      });
      kernel.registerService(TOOL_MANAGER_ID, toolManager);
      kernel.registerService(AI_MANAGER_ID, aiManager);
      const serviceManager = new ServiceManager(kernel.context);
      const moduleManager = new ModuleManager(kernel.context);

      // Ciclo de vida ordenado. Shutdown ocorre na ordem inversa.
      this.lifecycle = new RuntimeLifecycle(
        [
          { name: 'Tools', start: () => toolManager.load(TOOL_MANIFEST), stop: () => toolManager.disposeAll() },
          { name: 'Modules', start: () => moduleManager.loadAll(MODULE_MANIFEST), stop: () => moduleManager.disposeAll() },
          { name: 'Services', start: () => serviceManager.startAll(), stop: () => serviceManager.disposeAll() },
          // Agents: ponto de extensão futuro (um AgentManager entra aqui, no mesmo padrão).
        ],
        logger,
      );

      // Initializing: executa o startup ordenado.
      this._status = 'Initializing';
      await this.lifecycle.startUp();

      this._context = {
        kernel,
        modules: moduleManager,
        services: serviceManager,
        tools: toolManager,
        ai: aiManager,
        aiRegistry: providerManager,
        toolRegistry,
        logger: kernel.context.logger,
        config: kernel.context.config,
      };
      this._startedAt = Date.now();
      this._status = 'Running';
      logger.info('BeeHive Runtime em execução', {
        environment: kernel.context.config.environment,
      });
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'erro desconhecido';
      this._status = 'Failed';
      throw error;
    }
  }

  /** Encerra o sistema na ordem inversa (Shutdown ordenado). */
  async stop(): Promise<void> {
    if (this._status !== 'Running') return;
    this._status = 'Stopping';
    await this.lifecycle?.shutDown();
    this._context?.kernel.stop();
    this._startedAt = null;
    this._status = 'Stopped';
  }

  /** Saúde agregada de todos os componentes do sistema. */
  health(): RuntimeHealth {
    const components: ComponentHealth[] = [];
    if (this._context) {
      for (const m of this._context.modules.snapshots()) {
        components.push({ id: `module:${m.id}`, ok: m.health.ok, detail: m.lastError ?? undefined });
      }
      for (const s of this._context.services.snapshots()) {
        components.push({ id: `service:${s.id}`, ok: s.health.ok, detail: s.lastError ?? undefined });
      }
      for (const t of this._context.tools.list()) {
        components.push({ id: `tool:${t.id}`, ok: t.state !== 'Failed', detail: t.lastError ?? undefined });
      }
    }
    const ok = this._status === 'Running' && components.every((c) => c.ok);
    return { ok, status: this._status, components, checkedAt: Date.now() };
  }

  /** Retrato completo — o que um cliente Web/Desktop consultaria. */
  snapshot(): RuntimeSnapshot {
    return {
      status: this._status,
      environment: this._context?.config.environment ?? 'local',
      startedAt: this._startedAt,
      uptimeMs: this._startedAt !== null ? Date.now() - this._startedAt : null,
      health: this.health(),
      modules: this._context?.modules.snapshots() ?? [],
      services: this._context?.services.snapshots() ?? [],
      tools: this._context?.tools.list() ?? [],
      lastError: this._lastError,
    };
  }

  /** Logs do sistema (para Central/Dashboard/Auditoria e clientes). */
  logs() {
    return this._context?.logger.getEntries() ?? [];
  }
}
