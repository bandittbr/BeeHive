import { ICapability } from './ICapability';
import { IEventBus } from './IEventBus';
import { ILogger } from './ILogger';
import { IStorage } from './IStorage';
import { IMemory } from './IMemory';
import { IAIService } from './IAIService';

export interface IPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly manifest: PluginManifest;

  activate(ctx: PluginContext): Promise<void>;
  deactivate(): Promise<void>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: string[];
  adapters: string[];
  permissions: string[];
}

export interface PluginContext {
  capabilities: ICapabilityRegistry;
  events: IEventBus;
  storage: IStorage;
  logger: ILogger;
  memory: IMemory;
  ai: IAIService;
  config: IConfigService;
  permissions: IPermissionService;
  workflow: IWorkflowService;
}
