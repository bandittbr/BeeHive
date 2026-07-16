import type { IEventBus } from './events';
import type { ICommandBus } from './commands';
import type { IQueryBus } from './queries';
import type { IModuleLoader } from './modules';
import type { IPluginManager as IPluginLoader } from './plugins';
import type { IServiceRegistry } from './services';
import type { IScheduler } from './scheduler';
import type { IConfigurationManager } from './config';
import type { ILogger } from './logger';

export type KernelStatus =
  | 'booting'
  | 'running'
  | 'degraded'
  | 'stopping'
  | 'stopped'
  | 'crashed';

export interface IKernel {
  readonly id: string;
  readonly version: string;
  readonly status: KernelStatus;

  boot(): Promise<KernelBootReport>;
  shutdown(): Promise<void>;
  health(): Promise<KernelHealth>;

  readonly events: IEventBus;
  readonly commands: ICommandBus;
  readonly queries: IQueryBus;
  readonly modules: IModuleLoader;
  readonly plugins: IPluginLoader;
  readonly services: IServiceRegistry;
  readonly scheduler: IScheduler;
  readonly config: IConfigurationManager;
  readonly logger: ILogger;
}

export interface KernelBootReport {
  kernel: { status: KernelStatus; duration: number };
  modules: Array<{ id: string; status: 'loaded' | 'failed'; error?: string }>;
  plugins: Array<{ id: string; status: 'loaded' | 'failed'; error?: string }>;
  services: Array<{ id: string; status: 'registered' | 'failed'; error?: string }>;
  totalDuration: number;
}

export interface KernelHealth {
  status: KernelStatus;
  uptime: number;
  modules: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  plugins: Record<string, boolean>;
  memory: { heapUsed: number; heapTotal: number; external: number; rss: number };
  cpu: number;
}

export interface KernelDependencies {
  eventBus?: IEventBus;
  commandBus?: ICommandBus;
  queryBus?: IQueryBus;
  moduleLoader?: IModuleLoader;
  pluginLoader?: IPluginLoader;
  serviceRegistry?: IServiceRegistry;
  scheduler?: IScheduler;
  config?: IConfigurationManager;
  logger?: ILogger;
}


export interface KernelReport {
  kernel: { version: string; status: KernelStatus; duration: number };
  plugins: Array<{ id: string; status: 'activated' | 'failed'; error?: string }>;
  capabilities: number;
  providers: number;
}
