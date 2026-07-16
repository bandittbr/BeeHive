// Control Center Service — conectada ao Kernel via BeeHive Bridge
import {
  type ControlCenterState,
  type GeneralSettings,
  type ProfileSettings,
  type MemorySettings,
  type ModelsSettings,
  type ChatSettings,
  type AgentsSettings,
  type SkillsSettings,
  type PermissionSettings,
  type SystemSettings,
} from '../stores/control-center';
import { BeeHiveBridge } from './beehive-bridge';

export class ControlCenterService {
  private bridge: BeeHiveBridge;
  private listeners: Set<() => void> = new Set();

  constructor(bridge: BeeHiveBridge) {
    this.bridge = bridge;
  }

  // === GETTERS ===
  getGeneral(): GeneralSettings {
    return this.bridge.getGeneralSettings();
  }

  getProfile(): ProfileSettings {
    return this.bridge.getProfileSettings();
  }

  getMemory(): MemorySettings {
    return this.bridge.getMemorySettings();
  }

  getModels(): ModelsSettings {
    return this.bridge.getModelsSettings();
  }

  getChat(): ChatSettings {
    return this.bridge.getChatSettings();
  }

  getAgents(): AgentsSettings {
    return this.bridge.getAgentsSettings();
  }

  getSkills(): SkillsSettings {
    return this.bridge.getSkillsSettings();
  }

  getPermissions(): PermissionSettings {
    return this.bridge.getPermissionsSettings();
  }

  getSystem(): SystemSettings {
    return this.bridge.getSystemSettings();
  }

  // === SETTERS (persistem no Kernel) ===
  updateGeneral(updates: Partial<GeneralSettings>): void {
    this.bridge.updateGeneral(updates);
    this.notify();
  }

  updateProfile(updates: Partial<ProfileSettings>): void {
    this.bridge.updateProfile(updates);
    this.notify();
  }

  updateMemory(updates: Partial<MemorySettings>): void {
    this.bridge.updateMemory(updates);
    this.notify();
  }

  updateModels(updates: Partial<ModelsSettings>): void {
    this.bridge.updateModels(updates);
    this.notify();
  }

  updateChat(updates: Partial<ChatSettings>): void {
    this.bridge.updateChat(updates);
    this.notify();
  }

  updateAgents(updates: Partial<AgentsSettings>): void {
    this.bridge.updateAgents(updates);
    this.notify();
  }

  updateSkills(updates: Partial<SkillsSettings>): void {
    this.bridge.updateSkills(updates);
    this.notify();
  }

  updatePermissions(updates: Partial<PermissionSettings>): void {
    this.bridge.updatePermissions(updates);
    this.notify();
  }

  // === SUBSCRIPTION ===
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
