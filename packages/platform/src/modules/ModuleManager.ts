import type { EventName, ILogger, KernelContext } from '../kernel';
import type { BeeHiveModule, ModuleSnapshot, ModuleState } from './types';

/** Registro interno de estado de um módulo (fonte oficial para o Dashboard). */
interface ModuleRecord {
  module: BeeHiveModule;
  state: ModuleState;
  registeredAt: number;
  updatedAt: number;
  startedAt: number | null;
  lastError: string | null;
}

/**
 * ModuleManager — orquestra o ciclo de vida dos módulos sobre o Kernel.
 *
 * Responsabilidades:
 *  - resolver a ORDEM de carregamento por dependências (ordenação topológica);
 *  - executar o pipeline: validar → registrar → initialize → start;
 *  - manter o ESTADO de cada módulo e emitir EVENTOS a cada transição;
 *  - registrar tudo no Logger;
 *  - expor SNAPSHOTS para observabilidade (Dashboard/Central futuros).
 *
 * Não conhece nenhum módulo concreto. Módulos falam com o sistema só pelo
 * KernelContext — nunca entre si.
 */
export class ModuleManager {
  private readonly records = new Map<string, ModuleRecord>();
  private readonly logger: ILogger;

  constructor(private readonly context: KernelContext) {
    this.logger = context.logger.child('modules');
  }

  /** Descobre a ordem, valida e inicia todos os módulos automaticamente. */
  async loadAll(modules: readonly BeeHiveModule[]): Promise<void> {
    const now = Date.now();
    const ids = new Set(modules.map((m) => m.id));
    for (const module of modules) {
      this.records.set(module.id, {
        module,
        state: 'Loading',
        registeredAt: now,
        updatedAt: now,
        startedAt: null,
        lastError: null,
      });
    }

    const { ordered, cyclic } = this.resolveOrder(modules);
    for (const id of cyclic) this.fail(id, 'dependência cíclica');
    for (const module of ordered) {
      await this.boot(module, ids);
    }

    this.logger.info(`Módulos iniciados: ${this.runningCount()}/${modules.length}`);
  }

  /** Executa o ciclo de vida de um módulo até Running (ou Failed). */
  private async boot(module: BeeHiveModule, ids: Set<string>): Promise<void> {
    const record = this.records.get(module.id);
    if (!record || record.state === 'Failed') return;

    // 1. Validar dependências (existem e estão rodando).
    for (const dep of module.dependencies) {
      if (!ids.has(dep)) {
        this.fail(module.id, `dependência ausente: ${dep}`);
        return;
      }
      const depRecord = this.records.get(dep);
      if (!depRecord || depRecord.state !== 'Running') {
        this.fail(module.id, `dependência não iniciada: ${dep}`);
        return;
      }
    }

    try {
      // 2. Registrar capacidades no Kernel.
      await module.registerServices(this.context);
      await module.registerCommands(this.context);
      await module.registerEvents(this.context);
      this.transition(record, 'Registered', 'ModuleRegistered');

      // 3. Inicializar.
      this.touch(record, 'Initializing');
      await module.initialize(this.context);
      this.emit('ModuleInitialized', record);

      // 4. Iniciar.
      await module.start(this.context);
      record.startedAt = Date.now();
      this.transition(record, 'Running', 'ModuleStarted');
    } catch (error) {
      this.fail(module.id, error instanceof Error ? error.message : 'erro desconhecido');
    }
  }

  // ------------------------- Controles de ciclo de vida ------------------------

  async pause(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || record.state !== 'Running') return;
    await record.module.pause(this.context);
    record.startedAt = null;
    this.transition(record, 'Paused', 'ModulePaused');
  }

  async resume(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || record.state !== 'Paused') return;
    await record.module.resume(this.context);
    record.startedAt = Date.now();
    this.transition(record, 'Running', 'ModuleResumed');
  }

  async stop(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || (record.state !== 'Running' && record.state !== 'Paused')) return;
    await record.module.stop(this.context);
    record.startedAt = null;
    this.transition(record, 'Stopped', 'ModuleStopped');
  }

  async dispose(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || record.state === 'Disposed') return;
    await record.module.dispose(this.context);
    record.startedAt = null;
    this.transition(record, 'Disposed', 'ModuleDisposed');
  }

  async disposeAll(): Promise<void> {
    for (const id of [...this.records.keys()].reverse()) {
      await this.dispose(id);
    }
  }

  // ------------------------------ Observabilidade ------------------------------

  /** Retratos de todos os módulos (para o Dashboard/Central futuros). */
  snapshots(): ModuleSnapshot[] {
    return [...this.records.values()].map((record) => this.toSnapshot(record));
  }

  get(id: string): ModuleSnapshot | undefined {
    const record = this.records.get(id);
    return record ? this.toSnapshot(record) : undefined;
  }

  // --------------------------------- Internos ---------------------------------

  private toSnapshot(record: ModuleRecord): ModuleSnapshot {
    const health =
      record.state === 'Failed'
        ? { ok: false, detail: record.lastError ?? undefined }
        : record.module.health();
    return {
      id: record.module.id,
      name: record.module.name,
      version: record.module.version,
      state: record.state,
      dependencies: record.module.dependencies,
      uptimeMs: record.startedAt !== null ? Date.now() - record.startedAt : null,
      registeredAt: record.registeredAt,
      updatedAt: record.updatedAt,
      lastError: record.lastError,
      health,
    };
  }

  private transition(record: ModuleRecord, state: ModuleState, event: EventName): void {
    record.state = state;
    record.updatedAt = Date.now();
    this.context.events.emit(event, { id: record.module.id, name: record.module.name, state });
    this.logger.info(`${record.module.name}: ${state}`, { id: record.module.id });
  }

  private touch(record: ModuleRecord, state: ModuleState): void {
    record.state = state;
    record.updatedAt = Date.now();
    this.logger.debug(`${record.module.name}: ${state}`, { id: record.module.id });
  }

  private emit(event: EventName, record: ModuleRecord): void {
    this.context.events.emit(event, { id: record.module.id, name: record.module.name });
  }

  private fail(id: string, reason: string): void {
    const record = this.records.get(id);
    if (!record) return;
    record.state = 'Failed';
    record.lastError = reason;
    record.startedAt = null;
    record.updatedAt = Date.now();
    this.context.events.emit('ModuleFailed', { id, name: record.module.name, reason });
    this.logger.error(`${record.module.name}: Failed`, { id, reason });
  }

  private runningCount(): number {
    return [...this.records.values()].filter((record) => record.state === 'Running').length;
  }

  /**
   * Ordenação topológica pelas dependências (apenas entre módulos presentes).
   * Módulos em ciclo não são ordenáveis e voltam em `cyclic`.
   */
  private resolveOrder(modules: readonly BeeHiveModule[]): {
    ordered: BeeHiveModule[];
    cyclic: string[];
  } {
    const present = new Set(modules.map((m) => m.id));
    const byId = new Map(modules.map((m) => [m.id, m]));
    const indegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const module of modules) indegree.set(module.id, 0);
    for (const module of modules) {
      for (const dep of module.dependencies) {
        if (!present.has(dep)) continue; // dependência ausente é tratada na validação
        indegree.set(module.id, (indegree.get(module.id) ?? 0) + 1);
        dependents.set(dep, [...(dependents.get(dep) ?? []), module.id]);
      }
    }

    const queue = modules.filter((m) => (indegree.get(m.id) ?? 0) === 0).map((m) => m.id);
    const orderedIds: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      orderedIds.push(id);
      for (const dependent of dependents.get(id) ?? []) {
        const next = (indegree.get(dependent) ?? 0) - 1;
        indegree.set(dependent, next);
        if (next === 0) queue.push(dependent);
      }
    }

    const cyclic = modules.map((m) => m.id).filter((id) => !orderedIds.includes(id));
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((m): m is BeeHiveModule => m !== undefined);
    return { ordered, cyclic };
  }
}
