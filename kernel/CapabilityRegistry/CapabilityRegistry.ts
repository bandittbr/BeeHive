import type { ICapability, CapabilityEntry } from '@beehive/shared';

export class CapabilityRegistry {
  private entries = new Map<string, CapabilityEntry>();

  register(pluginId: string, capability: ICapability): void {
    this.entries.set(capability.id, { pluginId, capability });
  }

  unregister(pluginId: string, capabilityId: string): void {
    const entry = this.entries.get(capabilityId);
    if (entry?.pluginId === pluginId) this.entries.delete(capabilityId);
  }

  find(query: string): ICapability[] {
    const q = query.toLowerCase();
    return Array.from(this.entries.values())
      .filter(e => e.capability.id.toLowerCase().includes(q) || e.capability.name.toLowerCase().includes(q))
      .map(e => e.capability);
  }

  resolve(capabilityId: string): ICapability {
    const entry = this.entries.get(capabilityId);
    if (!entry) throw new Error(`Capability not found: ${capabilityId}`);
    return entry.capability;
  }

  list(): CapabilityEntry[] { return Array.from(this.entries.values()); }

  searchByTag(tag: string): ICapability[] {
    return Array.from(this.entries.values())
      .filter(e => e.capability.tags?.includes(tag))
      .map(e => e.capability);
  }
}
