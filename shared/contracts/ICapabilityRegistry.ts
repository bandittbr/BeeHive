import { ICapability } from './ICapability';

export interface ICapabilityRegistry {
  register(pluginId: string, capability: ICapability): void;
  unregister(pluginId: string, capabilityId: string): void;
  find(query: string): ICapability[];           // "quem sabe gerar video?"
  resolve(capabilityId: string): ICapability;   // "video.generate_shorts"
  list(): CapabilityEntry[];
  searchByTag(tag: string): ICapability[];
}

export interface CapabilityEntry {
  pluginId: string;
  capability: ICapability;
}
