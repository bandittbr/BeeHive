import type { Command, IConfigurationManager, IEventBus, ILogger } from '../kernel';

/**
 * Contratos da Service Layer do BeeHive.
 *
 * Um Service é onde vive a REGRA DE NEGÓCIO. Módulos não contêm regra: eles
 * apenas registram Services (e Commands/Events). Toda comunicação continua
 * passando pelo Event Bus / Kernel — Services não se importam diretamente.
 *
 * Aqui há apenas abstrações.
 */

/** Estados possíveis de um Service. (`Paused` é reservado para uso futuro.) */
export type ServiceState =
  | 'Registered'
  | 'Initializing'
  | 'Running'
  | 'Paused'
  | 'Stopped'
  | 'Failed'
  | 'Disposed';

export interface ServiceHealth {
  readonly ok: boolean;
  readonly detail?: string;
}

/**
 * A superfície que um Service recebe para interagir com o sistema.
 *
 * Mais restrita que o `KernelContext` de um módulo: um Service NÃO registra
 * outros Services/Commands — ele fornece capacidade e conversa pelo Event Bus,
 * despacha comandos e descobre outros Services por id.
 */
export interface ServiceContext {
  readonly events: IEventBus;
  readonly config: IConfigurationManager;
  readonly logger: ILogger;
  getService<T>(id: string): T | undefined;
  dispatch<R = unknown>(command: Command): Promise<R>;
}

/** Contrato obrigatório de todo Service do BeeHive. */
export interface BeeHiveService {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  initialize(context: ServiceContext): void | Promise<void>;
  start(context: ServiceContext): void | Promise<void>;
  stop(context: ServiceContext): void | Promise<void>;
  dispose(context: ServiceContext): void | Promise<void>;

  health(): ServiceHealth;
  status(): ServiceState;
}

/** Retrato de um Service para observabilidade (Dashboard/Central futuros). */
export interface ServiceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly state: ServiceState;
  readonly uptimeMs: number | null;
  readonly registeredAt: number;
  readonly updatedAt: number;
  readonly lastError: string | null;
  readonly health: ServiceHealth;
}
