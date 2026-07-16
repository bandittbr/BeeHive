import { IEventBus } from './IEventBus';
import { ICapabilityRegistry } from './ICapabilityRegistry';
import { ILogger } from './ILogger';
import { IStorage } from './IStorage';
import { IMemory } from './IMemory';
import { IAIService } from './IAIService';

export interface IKernel {
  readonly id: string;
  readonly version: string;
  readonly status: KernelStatus;

  boot(): Promise<KernelReport>;
  shutdown(): Promise<void>;
  health(): Promise<KernelHealth>;

  readonly events: IEventBus;
  readonly capabilities: ICapabilityRegistry;
  readonly logger: ILogger;
  readonly storage: IStorage;
  readonly memory: IMemory;
  readonly ai: IAIService;
  readonly scheduler: IScheduler;
  readonly workflows: IWorkflowRuntime;
  readonly agents: IAgentRuntime;
  readonly permissions: IPermissionService;
  readonly config: IConfigService;
  readonly metrics: IMetricsCollector;
  readonly secrets: ISecretsManager;
}

export type KernelStatus = 'booting' | 'running' | 'degraded' | 'stopping' | 'stopped';

export interface KernelReport {
  kernel: { version: string; status: KernelStatus; duration: number };
  plugins: Array<{ id: string; status: 'activated' | 'failed'; error?: string }>;
  capabilities: number;
  providers: number;
}

export interface KernelHealth {
  status: KernelStatus;
  uptime: number;
  plugins: Record<string, boolean>;
  capabilities: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
}
