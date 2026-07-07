import type { EventName, IEventBus, ILogger } from '../kernel';
import type { ToolRegistry } from './ToolRegistry';
import type {
  Tool,
  ToolContext,
  ToolDefinition,
  ToolExecutor,
  ToolRequest,
  ToolResponse,
  ToolSnapshot,
  ToolState,
} from './types';

interface ToolRecord {
  tool: Tool;
  state: ToolState;
  registeredAt: number;
  updatedAt: number;
  lastError: string | null;
}

export interface ToolManagerDeps {
  registry: ToolRegistry;
  logger: ILogger;
  events?: IEventBus;
}

let seq = 0;
const nextRequestId = () => `tool-${Date.now()}-${seq++}`;

/**
 * ToolManager — o ÚNICO ponto de execução de Tools.
 *
 * Descobre as Tools pelo ToolRegistry, gerencia o ciclo de vida (Registered →
 * Initializing → Available, Busy durante execução, Failed/Disposed), e executa.
 * Nenhum Service ou Provider executa uma ação diretamente — tudo passa por aqui.
 * Depende de abstrações (registry, logger, event bus) por injeção.
 */
export class ToolManager implements ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly logger: ILogger;
  private readonly events?: IEventBus;
  private readonly records = new Map<string, ToolRecord>();

  constructor(deps: ToolManagerDeps) {
    this.registry = deps.registry;
    this.logger = deps.logger.child('tools');
    this.events = deps.events;
  }

  /** Registra e inicializa todas as Tools (descoberta automática). */
  async load(tools: readonly Tool[]): Promise<void> {
    for (const tool of tools) {
      await this.registerTool(tool);
    }
    this.logger.info(`Tools disponíveis: ${this.availableCount()}/${tools.length}`);
  }

  private async registerTool(tool: Tool): Promise<void> {
    this.registry.register(tool);
    const now = Date.now();
    const record: ToolRecord = {
      tool,
      state: 'Registered',
      registeredAt: now,
      updatedAt: now,
      lastError: null,
    };
    this.records.set(tool.id, record);
    this.emit('ToolRegistered', record);

    try {
      this.touch(record, 'Initializing');
      await tool.initialize({ logger: this.logger.child(`tool:${tool.id}`) });
      this.transition(record, 'Available', 'ToolInitialized');
    } catch (error) {
      this.fail(record, error instanceof Error ? error.message : 'erro desconhecido');
    }
  }

  // -------------------------------- Execução ---------------------------------

  async execute<TInput = unknown, TOutput = unknown>(
    request: ToolRequest<TInput>,
  ): Promise<ToolResponse<TOutput>> {
    const startedAt = Date.now();
    const tool = this.registry.get(request.toolId);
    const record = this.records.get(request.toolId);

    if (!tool || !record) {
      return this.fault<TOutput>(request.toolId, 'Tool não encontrada', startedAt);
    }
    if (record.state !== 'Available') {
      return this.fault<TOutput>(request.toolId, `Tool indisponível (${record.state})`, startedAt);
    }

    this.touch(record, 'Busy');
    try {
      const context: ToolContext = {
        requestId: nextRequestId(),
        toolId: tool.id,
        logger: this.logger.child(`tool:${tool.id}`),
        signal: request.options?.signal,
        metadata: request.options?.metadata,
      };
      const output = (await tool.execute(request.input, context)) as TOutput;
      this.touch(record, 'Available');
      this.emit('ToolExecuted', record);
      return { toolId: tool.id, success: true, output, startedAt, finishedAt: Date.now() };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      record.lastError = message;
      // Falha de execução não desativa a Tool — volta a ficar disponível.
      this.touch(record, 'Available');
      this.events?.emit('ToolFailed', { id: tool.id, name: tool.name, error: message });
      this.logger.error(`Tool falhou na execução: ${tool.name}`, { error: message });
      return { toolId: tool.id, success: false, error: message, startedAt, finishedAt: Date.now() };
    }
  }

  // ------------------------------- Controles ---------------------------------

  async dispose(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record || record.state === 'Disposed') return;
    await record.tool.dispose();
    this.transition(record, 'Disposed', 'ToolDisposed');
  }

  async disposeAll(): Promise<void> {
    for (const id of [...this.records.keys()]) {
      await this.dispose(id);
    }
  }

  // ----------------------------- Observabilidade -----------------------------

  has(toolId: string): boolean {
    return this.records.has(toolId);
  }

  list(): ToolSnapshot[] {
    return [...this.records.values()].map((record) => this.toSnapshot(record));
  }

  get(id: string): ToolSnapshot | undefined {
    const record = this.records.get(id);
    return record ? this.toSnapshot(record) : undefined;
  }

  /** Delega ao Registry (Sprint 20) — as `ToolDefinition` das Tools registradas. */
  definitions(): readonly ToolDefinition[] {
    return this.registry.definitions();
  }

  // --------------------------------- Internos --------------------------------

  private fault<TOutput>(toolId: string, error: string, startedAt: number): ToolResponse<TOutput> {
    this.logger.warn(`Execução recusada: ${toolId}`, { error });
    return { toolId, success: false, error, startedAt, finishedAt: Date.now() };
  }

  private toSnapshot(record: ToolRecord): ToolSnapshot {
    return {
      id: record.tool.id,
      name: record.tool.name,
      version: record.tool.version,
      category: record.tool.category,
      capabilities: record.tool.capabilities,
      state: record.state,
      lastError: record.lastError,
      registeredAt: record.registeredAt,
      updatedAt: record.updatedAt,
    };
  }

  private transition(record: ToolRecord, state: ToolState, event: EventName): void {
    record.state = state;
    record.updatedAt = Date.now();
    this.emit(event, record);
    this.logger.info(`${record.tool.name}: ${state}`, { id: record.tool.id });
  }

  private touch(record: ToolRecord, state: ToolState): void {
    record.state = state;
    record.updatedAt = Date.now();
    this.logger.debug(`${record.tool.name}: ${state}`, { id: record.tool.id });
  }

  private emit(event: EventName, record: ToolRecord): void {
    this.events?.emit(event, { id: record.tool.id, name: record.tool.name, state: record.state });
  }

  private fail(record: ToolRecord, reason: string): void {
    record.state = 'Failed';
    record.lastError = reason;
    record.updatedAt = Date.now();
    this.events?.emit('ToolFailed', { id: record.tool.id, name: record.tool.name, reason });
    this.logger.error(`${record.tool.name}: Failed`, { id: record.tool.id, reason });
  }

  private availableCount(): number {
    return [...this.records.values()].filter((record) => record.state === 'Available').length;
  }
}
