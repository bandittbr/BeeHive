import type {
  Command,
  CommandHandler,
  ICommandDispatcher,
  IEventBus,
  ILogger,
  KernelContext,
  Unsubscribe,
} from './types';

/**
 * Despachante de comandos.
 *
 * Responsabilidade única: mapear um `Command` ao seu handler e encaminhá-lo.
 * Não implementa nenhuma regra de negócio — apenas orquestra a chamada e emite
 * os eventos de resultado (CommandExecuted / CommandFailed).
 *
 * Depende de abstrações (IEventBus, ILogger) por injeção. O contexto é obtido
 * de forma preguiçosa para quebrar o ciclo com o Kernel (que o constrói).
 */
export class CommandDispatcher implements ICommandDispatcher {
  private readonly handlers = new Map<string, CommandHandler>();

  constructor(
    private readonly events: IEventBus,
    private readonly logger: ILogger,
    private readonly getContext: () => KernelContext,
  ) {}

  register(type: string, handler: CommandHandler): Unsubscribe {
    if (this.handlers.has(type)) {
      throw new Error(`Comando já registrado: ${type}`);
    }
    this.handlers.set(type, handler);
    return () => {
      this.handlers.delete(type);
    };
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  async dispatch<R = unknown>(command: Command): Promise<R> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      this.events.emit('CommandFailed', { type: command.type, reason: 'sem-handler' });
      throw new Error(`Nenhum handler registrado para o comando: ${command.type}`);
    }

    try {
      const result = await handler(command.payload, this.getContext());
      this.events.emit('CommandExecuted', { type: command.type });
      return result as R;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.events.emit('CommandFailed', { type: command.type, reason });
      this.logger.error(`Comando falhou: ${command.type}`, { reason });
      throw error;
    }
  }
}
