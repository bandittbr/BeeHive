import type {
  Command,
  CommandHandler,
  IConfigurationManager,
  ICommandDispatcher,
  IEventBus,
  ILogger,
  IModule,
  IModuleLoader,
  IServiceRegistry,
  KernelContext,
  Unsubscribe,
} from './types';

/** Dependências do Kernel, injetadas pelo bootstrap (Inversão de Controle). */
export interface KernelDependencies {
  events: IEventBus;
  services: IServiceRegistry;
  config: IConfigurationManager;
  logger: ILogger;
  moduleLoader: IModuleLoader;
  /** Fábrica do dispatcher (recebe um getter do contexto para quebrar o ciclo). */
  createDispatcher: (getContext: () => KernelContext) => ICommandDispatcher;
}

/**
 * BeeHive Kernel — o coordenador central do sistema.
 *
 * É deliberadamente PEQUENO: ele apenas conecta as peças e expõe a superfície
 * (`KernelContext`) por onde todo o resto do sistema conversa. Não implementa
 * regra de negócio; delega tudo (eventos, comandos, serviços, módulos, config,
 * logs) aos componentes injetados.
 *
 * "Tudo passa pelo Kernel": módulos e serviços nunca se importam diretamente —
 * usam o contexto para emitir eventos, despachar comandos e descobrir serviços.
 */
export class Kernel {
  private readonly events: IEventBus;
  private readonly services: IServiceRegistry;
  private readonly config: IConfigurationManager;
  private readonly logger: ILogger;
  private readonly moduleLoader: IModuleLoader;
  private readonly dispatcher: ICommandDispatcher;
  private readonly ctx: KernelContext;
  private started = false;

  constructor(deps: KernelDependencies) {
    this.events = deps.events;
    this.services = deps.services;
    this.config = deps.config;
    this.logger = deps.logger;
    this.moduleLoader = deps.moduleLoader;
    this.dispatcher = deps.createDispatcher(() => this.ctx);

    this.ctx = {
      events: this.events,
      config: this.config,
      logger: this.logger,
      registerService: (id, service) => this.registerService(id, service),
      getService: (id) => this.getService(id),
      registerCommand: (type, handler) => this.registerCommand(type, handler),
      dispatch: (command) => this.dispatch(command),
    };
  }

  /** A superfície de acesso ao sistema para módulos e serviços. */
  get context(): KernelContext {
    return this.ctx;
  }

  registerService<T>(id: string, service: T): void {
    this.services.register(id, service);
    this.logger.info(`Serviço registrado: ${id}`);
    this.events.emit('ServiceRegistered', { id });
  }

  getService<T>(id: string): T | undefined {
    return this.services.get<T>(id);
  }

  registerCommand(type: string, handler: CommandHandler): Unsubscribe {
    return this.dispatcher.register(type, handler);
  }

  dispatch<R = unknown>(command: Command): Promise<R> {
    return this.dispatcher.dispatch<R>(command);
  }

  async loadModules(modules: readonly IModule[]): Promise<void> {
    await this.moduleLoader.load(modules, this.ctx);
  }

  /** Inicia o Kernel: liga a auditoria de eventos e anuncia SystemStarted. */
  start(): void {
    if (this.started) return;
    this.started = true;

    // Auditoria: todo evento vira um log (o Logger não emite eventos, sem ciclo).
    this.events.onAny((event) => {
      this.logger.debug(`evento: ${event.name}`, { payload: event.payload });
    });

    this.events.emit('SystemStarted', { environment: this.config.environment });
    this.logger.info('BeeHive Kernel iniciado', { environment: this.config.environment });
  }

  stop(): void {
    if (!this.started) return;
    this.events.emit('SystemStopped', {});
    this.logger.info('BeeHive Kernel parado');
    this.started = false;
  }
}
