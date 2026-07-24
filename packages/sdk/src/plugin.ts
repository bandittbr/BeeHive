import type { IPlugin, PluginManifest, PluginContext } from './types';

export abstract class Plugin implements IPlugin {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly manifest: PluginManifest;

  abstract activate(ctx: PluginContext): Promise<void>;
  abstract deactivate(): Promise<void>;
}
