import type { IKernel } from './kernel';
import type { ToolDefinition } from './tools';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  entryPoint: string;
  kernelVersion: string;
  permissions: string[];
  config?: Record<string, unknown>;
}

export interface BeeHivePlugin {
  readonly manifest: PluginManifest;
  isLoaded(): boolean;

  onLoad(kernel: IKernel, config?: Record<string, unknown>): Promise<void>;
  onUnload(): Promise<void>;

  getTools?(): ToolDefinition[];
  getUIComponents?(): PluginUIComponent[];
}

export interface PluginUIComponent {
  name: string;
  slot: string;
  component: string;
}

export interface IPluginLoader {
  load(pluginId: string): Promise<BeeHivePlugin>;
  loadFromPath(path: string): Promise<BeeHivePlugin>;
  unload(pluginId: string): Promise<void>;
  unloadAll(): Promise<void>;
  get(id: string): BeeHivePlugin | undefined;
  getAll(): Map<string, BeeHivePlugin>;
  scanDirectory(dir: string): Promise<PluginManifest[]>;
}
