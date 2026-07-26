"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistry = void 0;
class CapabilityRegistry {
    entries = new Map();
    register(pluginId, capability) {
        this.entries.set(capability.id, { pluginId, capability });
    }
    unregister(pluginId, capabilityId) {
        const entry = this.entries.get(capabilityId);
        if (entry?.pluginId === pluginId)
            this.entries.delete(capabilityId);
    }
    find(query) {
        const q = query.toLowerCase();
        return Array.from(this.entries.values())
            .filter(e => e.capability.id.toLowerCase().includes(q) || e.capability.name.toLowerCase().includes(q))
            .map(e => e.capability);
    }
    resolve(capabilityId) {
        const entry = this.entries.get(capabilityId);
        if (!entry)
            throw new Error(`Capability not found: ${capabilityId}`);
        return entry.capability;
    }
    list() { return Array.from(this.entries.values()); }
    searchByTag(tag) {
        return Array.from(this.entries.values())
            .filter(e => e.capability.tags?.includes(tag))
            .map(e => e.capability);
    }
}
exports.CapabilityRegistry = CapabilityRegistry;
