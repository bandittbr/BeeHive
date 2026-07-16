import type { ICapability, CapabilityInput, CapabilityOutput, ExecutionContext, CapabilityResult, IEventBus, ILogger } from '@beehive/sdk';
import type { IProviderRegistry, IProvider } from '@beehive/sdk';
import type { CapabilityRegistry } from '../kernel/CapabilityRegistry/CapabilityRegistry';
import { Capability } from '@beehive/sdk';

export class ProviderRouter {
  private originals = new Map<string, { pluginId: string; capability: ICapability }>();
  private active = false;

  constructor(
    private registry: IProviderRegistry,
    private capabilities: CapabilityRegistry,
  ) {}

  wrapAll(): void {
    if (this.active) return;
    const entries = this.capabilities.list() as Array<{ pluginId: string; capability: ICapability }>;

    for (const entry of entries) {
      const cap = entry.capability;
      const provider = this.registry.resolve(cap.id);
      if (provider) {
        this.originals.set(cap.id, { pluginId: entry.pluginId, capability: cap });
        const proxy = new ProviderProxyCapability(cap, provider, this.registry);
        this.capabilities.unregister(entry.pluginId, cap.id);
        this.capabilities.register('provider:proxy', proxy);
      }
    }
    this.active = true;
  }

  restoreAll(): void {
    if (!this.active) return;
    for (const [id, original] of this.originals) {
      const entries = this.capabilities.list() as Array<{ pluginId: string; capability: ICapability }>;
      const proxyEntry = entries.find(e => e.capability.id === id && e.pluginId === 'provider:proxy');
      if (proxyEntry) {
        this.capabilities.unregister('provider:proxy', id);
      }
      this.capabilities.register(original.pluginId, original.capability);
    }
    this.originals.clear();
    this.active = false;
  }

  isActive(): boolean { return this.active; }
}

export class ProviderProxyCapability extends Capability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: CapabilityInput[];
  readonly outputs: CapabilityOutput[];
  tags: string[];
  version?: string;

  constructor(
    original: ICapability,
    private provider: IProvider,
    private registry: IProviderRegistry,
  ) {
    super();
    this.id = original.id;
    this.name = original.name;
    this.description = original.description;
    this.inputs = original.inputs;
    this.outputs = original.outputs;
    this.tags = [...original.tags];
    this.version = original.version;
  }

  async readiness() {
    return this.provider.readiness();
  }

  async health() {
    return this.provider.health();
  }

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info('ProviderRouter: ' + this.id + ' -> ' + this.provider.id);

    try {
      const providerCtx = { logger: ctx.logger, events: ctx.events };
      const result = await this.provider.execute(this.id, params, providerCtx);
      return {
        success: result.success,
        outputs: result.outputs,
        error: result.error,
        metrics: { duration: Date.now() - start },
      };
    } catch (e: any) {
      return {
        success: false,
        outputs: {},
        error: e.message,
        metrics: { duration: Date.now() - start },
      };
    }
  }
}
