import type { IProvider, IProviderRegistry, ProviderPolicy, ProviderReadiness, ProviderHealth } from '@beehive/sdk';

export class ProviderRegistry implements IProviderRegistry {
  private providers = new Map<string, IProvider>();

  register(provider: IProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  resolve(capabilityId: string, policy?: ProviderPolicy): IProvider | undefined {
    const candidates: IProvider[] = [];

    for (const provider of this.providers.values()) {
      if (provider.capabilities.includes(capabilityId)) {
        candidates.push(provider);
      }
    }

    if (candidates.length === 0) return undefined;

    if (candidates.length === 1) return candidates[0];

    // Multiple providers: apply policy
    if (policy?.priority === 'cost') {
      // Prefer mock over external API
      const mock = candidates.find(p => p.type === 'mock');
      if (mock) return mock;
    }

    return candidates[0];
  }

  list(): IProvider[] {
    return Array.from(this.providers.values());
  }

  listByType(type: string): IProvider[] {
    return this.list().filter(p => p.type === type);
  }
}
