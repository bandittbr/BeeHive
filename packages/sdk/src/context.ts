import type { PluginContext as IPluginContext } from './types';
import type { ICapability } from './types';

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

  registerCapability(capability: ICapability): void {
    this.capabilities.register('plugin', capability);
  }

  unregisterCapability(capabilityId: string): void {
    this.capabilities.unregister('plugin', capabilityId);
  }

  publishEvent(event: any): void {
    this.events.publish(event);
  }
}
