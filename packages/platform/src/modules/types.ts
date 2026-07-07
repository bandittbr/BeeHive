import type { KernelContext } from '../kernel';

/**
 * Contratos do Sistema de Módulos do BeeHive.
 *
 * Um módulo é uma unidade independente do sistema (Conversa, Business, ...).
 * Ele NUNCA conhece outro módulo diretamente: recebe o `KernelContext` e fala
 * com o resto do sistema apenas pelo Kernel (eventos, comandos, serviços).
 *
 * Aqui há apenas abstrações — nenhuma regra de negócio.
 */

/** Estados possíveis de um módulo no seu ciclo de vida. */
export type ModuleState =
  | 'Registered'
  | 'Loading'
  | 'Initializing'
  | 'Running'
  | 'Paused'
  | 'Stopped'
  | 'Failed'
  | 'Disposed';

/** Saúde autorreportada de um módulo. */
export interface ModuleHealth {
  readonly ok: boolean;
  readonly detail?: string;
}

/**
 * Contrato obrigatório de todo módulo do BeeHive.
 *
 * Metadados + hooks de registro + ciclo de vida + introspecção. As dependências
 * declaram de quais outros módulos este depende (por id); o ModuleManager
 * garante que um módulo só inicie se suas dependências estiverem rodando.
 */
export interface BeeHiveModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly dependencies: readonly string[];

  /** Registro de capacidades no Kernel (chamados antes de initialize). */
  registerServices(context: KernelContext): void | Promise<void>;
  registerCommands(context: KernelContext): void | Promise<void>;
  registerEvents(context: KernelContext): void | Promise<void>;

  /** Ciclo de vida (orquestrado pelo ModuleManager). */
  initialize(context: KernelContext): void | Promise<void>;
  start(context: KernelContext): void | Promise<void>;
  stop(context: KernelContext): void | Promise<void>;
  pause(context: KernelContext): void | Promise<void>;
  resume(context: KernelContext): void | Promise<void>;
  dispose(context: KernelContext): void | Promise<void>;

  /** Introspecção. */
  health(): ModuleHealth;
  status(): ModuleState;
}

/**
 * Retrato de um módulo para observabilidade (futuro Dashboard/Central/Auditoria).
 * Contém tudo que uma tela precisaria para exibir o estado do sistema.
 */
export interface ModuleSnapshot {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly state: ModuleState;
  readonly dependencies: readonly string[];
  /** Tempo em execução (ms) desde a última entrada em Running, ou null. */
  readonly uptimeMs: number | null;
  readonly registeredAt: number;
  readonly updatedAt: number;
  readonly lastError: string | null;
  readonly health: ModuleHealth;
}
