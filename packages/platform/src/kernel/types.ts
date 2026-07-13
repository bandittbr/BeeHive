/**
 * Contratos do Kernel do BeeHive.
 *
 * Este arquivo define APENAS abstrações (interfaces e tipos). Nenhum componente
 * do sistema depende de uma implementação concreta — todos dependem destes
 * contratos (Princípio da Inversão de Dependência / substituibilidade, P6/P7).
 *
 * Nada aqui é regra de negócio. É o vocabulário e a fiação da fundação.
 */

/** Ambientes previstos para o BeeHive. */
export type EnvironmentName = 'local' | 'cloud' | 'development' | 'production' | 'test';

/**
 * Catálogo oficial de eventos do sistema.
 *
 * Nem todos são emitidos pela infraestrutura agora: alguns (MessageReceived,
 * ProjectCreated, etc.) são o vocabulário que os módulos futuros usarão. A
 * infraestrutura, nesta fundação, emite apenas os eventos de ciclo de vida.
 */
export type EventName =
  | 'SystemStarted'
  | 'SystemStopped'
  | 'ModuleLoaded'
  | 'ModuleRegistered'
  | 'ModuleInitialized'
  | 'ModuleStarted'
  | 'ModulePaused'
  | 'ModuleResumed'
  | 'ModuleStopped'
  | 'ModuleFailed'
  | 'ModuleDisposed'
  | 'ServiceRegistered'
  | 'ServiceInitialized'
  | 'ServiceStarted'
  | 'ServiceStopped'
  | 'ServiceFailed'
  | 'ServiceDisposed'
  | 'CommandExecuted'
  | 'CommandFailed'
  | 'ToolRegistered'
  | 'ToolInitialized'
  | 'ToolExecuted'
  | 'ToolFailed'
  | 'ToolDisposed'
  | 'ProviderChanged'
  | 'MessageReceived'
  | 'MessageSent'
  | 'MessageStreamStarted'
  | 'MessageStreamChunk'
  | 'MessageStreamCompleted'
  | 'MessageStreamFailed'
  | 'ConversationHistoryCleared'
  | 'ConversationHistoryUpdated'
  | 'ProjectCreated'
  | 'ProjectOpened'
  | 'AlertCreated'
  | 'LogCreated';

/** Um evento que trafega pelo barramento. */
export interface BeeHiveEvent<P = unknown> {
  readonly name: EventName;
  readonly payload: P;
  readonly timestamp: number;
}

export type EventHandler<P = unknown> = (event: BeeHiveEvent<P>) => void;
export type AnyEventHandler = (event: BeeHiveEvent) => void;
export type Unsubscribe = () => void;

/** Barramento de eventos: a única forma de componentes se comunicarem. */
export interface IEventBus {
  on<P = unknown>(name: EventName, handler: EventHandler<P>): Unsubscribe;
  once<P = unknown>(name: EventName, handler: EventHandler<P>): Unsubscribe;
  /** Observa todos os eventos (usado por logging/auditoria). */
  onAny(handler: AnyEventHandler): Unsubscribe;
  emit<P = unknown>(name: EventName, payload: P): void;
}

/** Registro de serviços descobríveis pelo Kernel. */
export interface IServiceRegistry {
  register<T>(id: string, service: T): void;
  get<T>(id: string): T | undefined;
  has(id: string): boolean;
  list(): readonly string[];
}

/** Uma ação do sistema, representada como dado (não como chamada direta). */
export interface Command<P = unknown> {
  readonly type: string;
  readonly payload?: P;
}

export type CommandHandler = (
  payload: unknown,
  context: KernelContext,
) => unknown | Promise<unknown>;

/** Recebe comandos e os encaminha ao handler registrado. Sem lógica de negócio. */
export interface ICommandDispatcher {
  register(type: string, handler: CommandHandler): Unsubscribe;
  has(type: string): boolean;
  dispatch<R = unknown>(command: Command): Promise<R>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly scope: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
}

/** Logging centralizado. Consumido futuramente por Central, Dashboard e Auditoria. */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  /** Cria um logger com escopo (ex.: por módulo), compartilhando o mesmo histórico. */
  child(scope: string): ILogger;
  getEntries(): readonly LogEntry[];
}

/** Leitura centralizada de configuração. Somente leitura (sem persistência). */
export interface IConfigurationManager {
  readonly environment: EnvironmentName;
  get<T = unknown>(key: string, fallback?: T): T | undefined;
  getAll(): Readonly<Record<string, unknown>>;
}

/**
 * A superfície que módulos e serviços recebem para falar com o sistema.
 *
 * É a materialização da regra "tudo passa pelo Kernel": um módulo nunca importa
 * outro módulo; ele usa este contexto para emitir eventos, despachar comandos e
 * descobrir serviços.
 */
export interface KernelContext {
  readonly events: IEventBus;
  readonly config: IConfigurationManager;
  readonly logger: ILogger;
  registerService<T>(id: string, service: T): void;
  getService<T>(id: string): T | undefined;
  registerCommand(type: string, handler: CommandHandler): Unsubscribe;
  dispatch<R = unknown>(command: Command): Promise<R>;
}

/** Um módulo do BeeHive (Conversa, Business, ...). Registra-se no contexto. */
export interface IModule {
  readonly id: string;
  readonly name: string;
  register(context: KernelContext): void | Promise<void>;
}

/** Localiza e carrega módulos, registrando-os no sistema. */
export interface IModuleLoader {
  load(modules: readonly IModule[], context: KernelContext): Promise<void>;
  loaded(): readonly string[];
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/** Tipo de recorrência de uma tarefa agendada. */
export type ScheduleRecurrence = 'once' | 'interval' | 'cron' | 'daily' | 'weekly' | 'monthly';

/** Configuração de uma tarefa agendada. */
export interface ScheduleConfig {
  readonly type: ScheduleRecurrence;
  /** Intervalo em ms (para 'interval'). */
  readonly intervalMs?: number;
  /** Expressão cron (para 'cron'). */
  readonly cron?: string;
  /** Horário no formato 'HH:MM' (para 'daily'/'weekly'/'monthly'). */
  readonly time?: string;
  /** Dia da semana 0-6 (para 'weekly'). */
  readonly dayOfWeek?: number;
  /** Dia do mês 1-31 (para 'monthly'). */
  readonly dayOfMonth?: number;
}

/** Handler de uma tarefa agendada. */
export type TaskHandler = (context: KernelContext) => void | Promise<void>;

/** Uma tarefa agendada no sistema. */
export interface ScheduledTask {
  readonly id: string;
  readonly name: string;
  readonly schedule: ScheduleConfig;
  readonly handler: TaskHandler;
  readonly createdAt: number;
  running: boolean;
  lastRunAt: number | null;
  lastError: string | null;
  runCount: number;
}

/** Gerenciador de tarefas agendadas. */
export interface IScheduler {
  /** Agenda uma nova tarefa. Retorna o id da tarefa. */
  schedule(task: Omit<ScheduledTask, 'createdAt' | 'running' | 'lastRunAt' | 'lastError' | 'runCount'>): string;
  /** Cancela uma tarefa agendada. */
  cancel(taskId: string): boolean;
  /** Pausa uma tarefa (não executa até ser retomada). */
  pause(taskId: string): boolean;
  /** Retoma uma tarefa pausada. */
  resume(taskId: string): boolean;
  /** Lista todas as tarefas agendadas. */
  list(): readonly ScheduledTask[];
  /** Obtém uma tarefa pelo id. */
  get(taskId: string): ScheduledTask | undefined;
  /** Executa uma tarefa imediatamente (fora do agendamento). */
  runNow(taskId: string): Promise<void>;
  /** Para o scheduler e limpa todos os timers. */
  stop(): void;
}

// ---------------------------------------------------------------------------
// Agent Manager
// ---------------------------------------------------------------------------

/** Estados de um agente no seu ciclo de vida. */
export type AgentState = 'Idle' | 'Running' | 'Paused' | 'Stopped' | 'Failed' | 'Disposed';

/** Um agente executado pelo Kernel. */
export interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly tools: readonly string[];
  readonly state: AgentState;
  start(context: KernelContext): void | Promise<void>;
  stop(context: KernelContext): void | Promise<void>;
  pause(context: KernelContext): void | Promise<void>;
  resume(context: KernelContext): void | Promise<void>;
  dispose(context: KernelContext): void | Promise<void>;
  health(): { ok: boolean; detail?: string };
}

/** Gerenciador de agentes. */
export interface IAgentManager {
  register(agent: IAgent): void;
  unregister(agentId: string): boolean;
  get(agentId: string): IAgent | undefined;
  list(): readonly IAgent[];
  start(agentId: string): Promise<void>;
  stop(agentId: string): Promise<void>;
  pause(agentId: string): Promise<void>;
  resume(agentId: string): Promise<void>;
  dispose(agentId: string): Promise<void>;
  disposeAll(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memory Manager
// ---------------------------------------------------------------------------

/** Tipo de entrada de memória. */
export type MemoryEntryType = 'context' | 'decision' | 'preference' | 'goal' | 'result' | 'agent_history' | 'observation';

/** Uma entrada na memória do sistema. */
export interface MemoryEntry {
  readonly id: string;
  readonly type: MemoryEntryType;
  readonly scope: string;
  readonly key: string;
  readonly value: unknown;
  readonly tags: readonly string[];
  readonly timestamp: number;
  readonly ttl?: number;
}

/** Gerenciador de memória do sistema. */
export interface IMemoryManager {
  /** Armazena um valor na memória. */
  set(type: MemoryEntryType, scope: string, key: string, value: unknown, tags?: string[], ttl?: number): void;
  /** Recupera um valor da memória. */
  get<T = unknown>(scope: string, key: string): T | undefined;
  /** Busca entradas por tipo e/ou escopo. */
  query(options: { type?: MemoryEntryType; scope?: string; tags?: string[]; limit?: number }): readonly MemoryEntry[];
  /** Remove uma entrada. */
  delete(id: string): boolean;
  /** Limpa entradas expiradas. */
  cleanExpired(): number;
  /** Lista todos os escopos disponíveis. */
  scopes(): readonly string[];
}

// ---------------------------------------------------------------------------
// Plugin Manager
// ---------------------------------------------------------------------------

/** Permissões que um plugin pode solicitar. */
export type PluginPermission =
  | 'filesystem.read'
  | 'filesystem.write'
  | 'network.http'
  | 'network.websocket'
  | 'process.exec'
  | 'browser.control'
  | 'ai.access'
  | 'database.read'
  | 'database.write'
  | 'eventbus.publish'
  | 'eventbus.subscribe';

/** Manifesto de um plugin. */
export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author?: string;
  readonly permissions: readonly PluginPermission[];
  readonly dependencies: readonly string[];
  readonly commands: readonly string[];
  readonly events: readonly string[];
  readonly homepage?: string;
  readonly license?: string;
}

/** Estado de um plugin carregado. */
export type PluginState = 'Registered' | 'Loading' | 'Loaded' | 'Active' | 'Inactive' | 'Failed' | 'Disposed';

/** Um plugin carregado no sistema. */
export interface IPlugin {
  readonly manifest: PluginManifest;
  readonly state: PluginState;
  activate(context: KernelContext): void | Promise<void>;
  deactivate(context: KernelContext): void | Promise<void>;
  dispose(context: KernelContext): void | Promise<void>;
}

/** Gerenciador de plugins. */
export interface IPluginManager {
  /** Registra um plugin (a partir do manifesto + factory). */
  register(plugin: IPlugin): void;
  /** Carrega e ativa um plugin. */
  load(pluginId: string): Promise<void>;
  /** Desativa um plugin (sem descarregar). */
  unload(pluginId: string): Promise<void>;
  /** Remove um plugin do sistema. */
  dispose(pluginId: string): Promise<void>;
  /** Obtém um plugin pelo id. */
  get(pluginId: string): IPlugin | undefined;
  /** Lista todos os plugins registrados. */
  list(): readonly IPlugin[];
  /** Lista plugins ativos. */
  active(): readonly IPlugin[];
}
