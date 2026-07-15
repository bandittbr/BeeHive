import type { IKernel } from './kernel';
import type { EventEnvelope, EventContext } from './events';
import type { CommandEnvelope, CommandContext } from './commands';

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  provides: ModuleCapability[];
  subscribesTo: string[];
  commands: string[];
  ui?: ModuleUI;
  permissions: string[];
  resources?: { memory?: number; cpu?: number };
}

export interface ModuleCapability {
  id: string;
  description: string;
}

export interface ModuleUI {
  routes: ModuleRoute[];
  navigation: ModuleNavItem[];
  components: string[];
}

export interface ModuleRoute {
  path: string;
  component: string;
  roles?: string[];
}

export interface ModuleNavItem {
  label: string;
  path: string;
  icon?: string;
  children?: ModuleNavItem[];
}

export type ModuleStatus =
  | 'registered'
  | 'loading'
  | 'loaded'
  | 'error'
  | 'unloaded';

export interface ModuleHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastActivity?: number;
  metrics?: Record<string, number>;
}

export interface BeeHiveModule {
  readonly manifest: ModuleManifest;
  readonly status: ModuleStatus;

  onBoot(kernel: IKernel): Promise<void>;
  onShutdown(): Promise<void>;

  health(): Promise<ModuleHealth>;

  handleEvent?(event: EventEnvelope, ctx: EventContext): Promise<void>;
  handleCommand?(command: CommandEnvelope, ctx: CommandContext): Promise<unknown>;
}

export interface IModuleLoader {
  load(moduleId: string): Promise<BeeHiveModule>;
  loadFromPath(path: string): Promise<BeeHiveModule>;
  unload(moduleId: string): Promise<void>;
  unloadAll(): Promise<void>;
  get(id: string): BeeHiveModule | undefined;
  getAll(): Map<string, BeeHiveModule>;
  isLoaded(id: string): boolean;
  getManifests(): ModuleManifest[];
  scanDirectory(dir: string): Promise<ModuleManifest[]>;
}
