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
