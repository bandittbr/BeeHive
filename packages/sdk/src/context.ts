import type { PluginContext as IPluginContext } from './types';

export class PluginContext implements IPluginContext {
  constructor(
    public readonly capabilities: any,
    public readonly events: any,
    public readonly storage: any,
    public readonly logger: any,
    public readonly memory: any,
    public readonly ai: any,
    public readonly config: any,
    public readonly permissions: any,
    public readonly workflow: any,
  ) {}
}
