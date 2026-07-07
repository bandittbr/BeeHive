import type { EventName, ILogger, KernelContext } from '../kernel';
import type { BeeHiveService, ServiceContext, ServiceSnapshot, ServiceState } from './types';

/** Registro interno de estado de um Service (fonte oficial p/ observabilidade). */
interface ServiceRecord {
  service: BeeHiveService;
  state: ServiceState;
  registeredAt: number;
  updatedAt: number;
  startedAt: number | null;
  lastError: string | null;
  context: ServiceContext;
}

/** Type guard estrutural: um objeto do registry é um Service gerenciável? */
function isBeeHiveService(value: unknown): value is BeeHiveService {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.version === 'string' &&
    typeof s.initialize === 'function' &&
    typeof s.start === 'function' &&
    typeof s.stop === 'function' &&
    typeof s.dispose === 'function' &&
    typeof s.health === 'function' &&
    typeof s.status === 'function'
  );
}

/**
 * ServiceManager — descobre e gerencia o ciclo de vida dos Services.
 *
 * Descoberta: assina o evento `ServiceRegistered` do Kernel. Quando um módulo
 * registra um Service (via `KernelContext.registerService`), o ServiceManager o
 * detecta no ServiceRegistry do Kernel e o inscreve para gestão de ciclo de vida.
 *
 * O Kernel então os inicializa via `startAll()`. Não conhece nenhum Service
 * concreto; tudo por contrato e pelo Event Bus.
 */
export class ServiceManager {
  private readonly records = new Map<string, ServiceRecord>();
  private readonly logger: ILogger;

  constructor(private readonly kernel: KernelContext) {
    this.logger = kernel.logger.child('services');
    // Descoberta reativa: todo Service registrado por um módulo é inscrito.
    this.kernel.events.on('ServiceRegistered', (event) => {
      const id = (event.payload as { id?: string }).id;
      if (id) this.enroll(id);
    });
  }

  /** Inicializa e inicia todos os Services descobertos (chamado pelo Kernel/boot). */
  async startAll(): Promise<void> {
    for (const record of this.records.values()) {
      if (record.state === 'Registered') await this.startOne(record);
    }
    this.logger.info(`Serviços em execução: ${this.runningCount()}/${this.records.size}`);
  }

  async stop(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || record.state !== 'Running') return;
    await record.service.stop(record.context);
    record.startedAt = null;
    this.transition(record, 'Stopped', 'ServiceStopped');
  }

  async dispose(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || record.state === 'Disposed') return;
    await record.service.dispose(record.context);
    record.startedAt = null;
    this.transition(record, 'Disposed', 'ServiceDisposed');
  }

  async disposeAll(): Promise<void> {
    for (const id of [...this.records.keys()].reverse()) {
      await this.dispose(id);
    }
  }

  snapshots(): ServiceSnapshot[] {
    return [...this.records.values()].map((record) => this.toSnapshot(record));
  }

  get(id: string): ServiceSnapshot | undefined {
    const record = this.records.get(id);
    return record ? this.toSnapshot(record) : undefined;
  }

  // --------------------------------- Internos ---------------------------------

  private enroll(id: string): void {
    if (this.records.has(id)) return;
    const service = this.kernel.getService<unknown>(id);
    if (!isBeeHiveService(service)) return; // objeto não é um Service gerenciável
    const now = Date.now();
    this.records.set(id, {
      service,
      state: 'Registered',
      registeredAt: now,
      updatedAt: now,
      startedAt: null,
      lastError: null,
      context: this.makeContext(service.id),
    });
    this.logger.info(`Serviço descoberto: ${service.name}`, { id });
  }

  private makeContext(id: string): ServiceContext {
    return {
      events: this.kernel.events,
      config: this.kernel.config,
      logger: this.kernel.logger.child(`service:${id}`),
      getService: (serviceId) => this.kernel.getService(serviceId),
      dispatch: (command) => this.kernel.dispatch(command),
    };
  }

  private async startOne(record: ServiceRecord): Promise<void> {
    try {
      this.touch(record, 'Initializing');
      await record.service.initialize(record.context);
      this.emit('ServiceInitialized', record);
      await record.service.start(record.context);
      record.startedAt = Date.now();
      this.transition(record, 'Running', 'ServiceStarted');
    } catch (error) {
      this.fail(record, error instanceof Error ? error.message : 'erro desconhecido');
    }
  }

  private toSnapshot(record: ServiceRecord): ServiceSnapshot {
    const health =
      record.state === 'Failed'
        ? { ok: false, detail: record.lastError ?? undefined }
        : record.service.health();
    return {
      id: record.service.id,
      name: record.service.name,
      version: record.service.version,
      state: record.state,
      uptimeMs: record.startedAt !== null ? Date.now() - record.startedAt : null,
      registeredAt: record.registeredAt,
      updatedAt: record.updatedAt,
      lastError: record.lastError,
      health,
    };
  }

  private transition(record: ServiceRecord, state: ServiceState, event: EventName): void {
    record.state = state;
    record.updatedAt = Date.now();
    this.kernel.events.emit(event, { id: record.service.id, name: record.service.name, state });
    this.logger.info(`${record.service.name}: ${state}`, { id: record.service.id });
  }

  private touch(record: ServiceRecord, state: ServiceState): void {
    record.state = state;
    record.updatedAt = Date.now();
    this.logger.debug(`${record.service.name}: ${state}`, { id: record.service.id });
  }

  private emit(event: EventName, record: ServiceRecord): void {
    this.kernel.events.emit(event, { id: record.service.id, name: record.service.name });
  }

  private fail(record: ServiceRecord, reason: string): void {
    record.state = 'Failed';
    record.lastError = reason;
    record.startedAt = null;
    record.updatedAt = Date.now();
    this.kernel.events.emit('ServiceFailed', { id: record.service.id, name: record.service.name, reason });
    this.logger.error(`${record.service.name}: Failed`, { id: record.service.id, reason });
  }

  private runningCount(): number {
    return [...this.records.values()].filter((record) => record.state === 'Running').length;
  }
}
