import type { IConfigurationManager, ILogger, Kernel } from '../kernel';
import type { ModuleManager, ModuleSnapshot } from '../modules';
import type { ServiceManager, ServiceSnapshot } from '../services';
import type { AIManager, AIProviderRegistry } from '../ai';
import type { ToolManager, ToolRegistry, ToolSnapshot } from '../tools';

/**
 * Contratos do BeeHive Runtime.
 *
 * O Runtime é o responsável por EXECUTAR todo o Sistema Operacional: dá boot no
 * Kernel e conduz o ciclo de vida de Tools, Providers (AI), Services, Modules e
 * (futuros) Agents. A interface Web/Desktop é apenas um cliente que consulta o
 * Runtime (status, health, snapshot, logs). Aqui há apenas abstrações.
 */

/** Estados do Runtime. */
export type RuntimeStatus =
  | 'Boot'
  | 'Loading'
  | 'Initializing'
  | 'Running'
  | 'Stopping'
  | 'Stopped'
  | 'Failed';

export interface ComponentHealth {
  readonly id: string;
  readonly ok: boolean;
  readonly detail?: string;
}

export interface RuntimeHealth {
  readonly ok: boolean;
  readonly status: RuntimeStatus;
  readonly components: readonly ComponentHealth[];
  readonly checkedAt: number;
}

/**
 * O "handle" do sistema em execução — o que o Runtime expõe. Reúne o Kernel e
 * os gerenciadores. Clientes (Web/Desktop) NÃO tocam nisto diretamente em
 * produção: consultam via snapshot/health (que serão servidos por rede).
 */
export interface RuntimeContext {
  readonly kernel: Kernel;
  readonly modules: ModuleManager;
  readonly services: ServiceManager;
  readonly tools: ToolManager;
  readonly ai: AIManager;
  /** Onde os Providers de IA serão conectados. */
  readonly aiRegistry: AIProviderRegistry;
  /** Onde as Tools serão conectadas. */
  readonly toolRegistry: ToolRegistry;
  readonly logger: ILogger;
  readonly config: IConfigurationManager;
}

/** Retrato completo do sistema — o que um cliente Web/Desktop consultaria. */
export interface RuntimeSnapshot {
  readonly status: RuntimeStatus;
  readonly environment: string;
  readonly startedAt: number | null;
  readonly uptimeMs: number | null;
  readonly health: RuntimeHealth;
  readonly modules: readonly ModuleSnapshot[];
  readonly services: readonly ServiceSnapshot[];
  readonly tools: readonly ToolSnapshot[];
  readonly lastError: string | null;
}

/** Um passo do ciclo de vida (Startup/Shutdown ordenados). */
export interface RuntimeStep {
  readonly name: string;
  start(): void | Promise<void>;
  stop?(): void | Promise<void>;
}
