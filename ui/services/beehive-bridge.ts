// BeeHive Bridge — Conecta o Kernel ao Control Center
// A UI não acessa o Kernel diretamente. Usa este bridge como única porta.

import type { Kernel } from '../../kernel/Kernel';
import type { IProviderRegistry } from '@beehive/sdk';
import type { ControlCenterState, GeneralSettings, ProfileSettings, MemorySettings, ModelsSettings, ChatSettings, AgentsSettings, SkillsSettings, PermissionSettings, SystemSettings } from '../stores/control-center';

export class BeeHiveBridge {
  private kernel: Kernel | null = null;
  private providerRegistry: IProviderRegistry | null = null;

  setKernel(kernel: Kernel): void {
    this.kernel = kernel;
  }

  setProviderRegistry(registry: IProviderRegistry): void {
    this.providerRegistry = registry;
  }

  // === GENERAL ===
  getGeneralSettings(): GeneralSettings {
    if (!this.kernel) return this.getDefaultGeneral();
    const config = this.kernel.config;
    return {
      theme: (config.get<string>('theme') || 'system') as 'light' | 'dark' | 'system',
      language: config.get<string>('language') || 'pt-BR',
      startup: (config.get<string>('startup') || 'dashboard') as 'last-session' | 'dashboard' | 'default-agent',
      notifications: config.get<boolean>('notifications') ?? true,
      autoUpdates: config.get<boolean>('autoUpdates') ?? true,
    };
  }

  updateGeneral(updates: Partial<GeneralSettings>): void {
    if (!this.kernel) return;
    const config = this.kernel.config;
    for (const [key, value] of Object.entries(updates)) {
      config.set(key, value);
    }
  }

  // === PROFILE ===
  getProfileSettings(): ProfileSettings {
    if (!this.kernel) return this.getDefaultProfile();
    const config = this.kernel.config;
    return {
      name: config.get<string>('profile.name') || '',
      avatar: config.get<string>('profile.avatar') || '',
      timezone: config.get<string>('profile.timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
      aiNickname: config.get<string>('profile.aiNickname') || '',
      primaryGoal: config.get<string>('profile.primaryGoal') || '',
    };
  }

  updateProfile(updates: Partial<ProfileSettings>): void {
    if (!this.kernel) return;
    const config = this.kernel.config;
    if (updates.name !== undefined) config.set('profile.name', updates.name);
    if (updates.avatar !== undefined) config.set('profile.avatar', updates.avatar);
    if (updates.timezone !== undefined) config.set('profile.timezone', updates.timezone);
    if (updates.aiNickname !== undefined) config.set('profile.aiNickname', updates.aiNickname);
    if (updates.primaryGoal !== undefined) config.set('profile.primaryGoal', updates.primaryGoal);
  }

  // === MEMORY ===
  getMemorySettings(): MemorySettings {
    if (!this.kernel) return this.getDefaultMemory();
    const config = this.kernel.config;
    return {
      enabled: config.get<boolean>('memory.enabled') ?? true,
      autoSave: config.get<boolean>('memory.autoSave') ?? true,
      categories: {
        preferences: config.get<boolean>('memory.categories.preferences') ?? true,
        projects: config.get<boolean>('memory.categories.projects') ?? true,
        people: config.get<boolean>('memory.categories.people') ?? true,
        knowledge: config.get<boolean>('memory.categories.knowledge') ?? true,
      },
      maxSize: config.get<number>('memory.maxSize') || 1000,
    };
  }

  updateMemory(updates: Partial<MemorySettings>): void {
    if (!this.kernel) return;
    const config = this.kernel.config;
    if (updates.enabled !== undefined) config.set('memory.enabled', updates.enabled);
    if (updates.autoSave !== undefined) config.set('memory.autoSave', updates.autoSave);
    if (updates.maxSize !== undefined) config.set('memory.maxSize', updates.maxSize);
    if (updates.categories) {
      for (const [key, value] of Object.entries(updates.categories)) {
        config.set('memory.categories.' + key, value);
      }
    }
  }

  // === MODELS ===
  getModelsSettings(): ModelsSettings {
    if (!this.providerRegistry) return this.getDefaultModels();
    const providers = this.providerRegistry.list();
    const chatProvider = providers.find(p => p.capabilities.includes('chat.generate'));
    return {
      chat: {
        provider: chatProvider?.id || 'mock',
        model: chatProvider ? 'configured' : 'default',
        contextWindow: 8192,
        estimatedCost: chatProvider?.id === 'mock' ? '$0.00' : 'varies',
        status: chatProvider ? 'active' : 'inactive',
      },
      coding: {
        provider: chatProvider?.id || 'mock',
        model: 'default',
        contextWindow: 8192,
        estimatedCost: '$0.00',
        status: 'active',
      },
      embeddings: {
        provider: 'mock',
        model: 'default',
        contextWindow: 0,
        estimatedCost: '$0.00',
        status: 'inactive',
      },
    };
  }

  updateModels(updates: Partial<ModelsSettings>): void {
    // Future: atualizar config do provider
    if (!this.kernel) return;
    const config = this.kernel.config;
    if (updates.chat?.provider) config.set('models.chat.provider', updates.chat.provider);
    if (updates.chat?.model) config.set('models.chat.model', updates.chat.model);
  }

  // === CHAT ===
  getChatSettings(): ChatSettings {
    if (!this.kernel) return this.getDefaultChat();
    const config = this.kernel.config;
    return {
      temperature: config.get<number>('chat.temperature') ?? 0.7,
      responseLength: (config.get<string>('chat.responseLength') || 'normal') as 'short' | 'normal' | 'detailed',
      streaming: config.get<boolean>('chat.streaming') ?? true,
      showReasoning: config.get<boolean>('chat.showReasoning') ?? false,
      saveConversations: config.get<boolean>('chat.saveConversations') ?? true,
    };
  }

  updateChat(updates: Partial<ChatSettings>): void {
    if (!this.kernel) return;
    const config = this.kernel.config;
    if (updates.temperature !== undefined) config.set('chat.temperature', updates.temperature);
    if (updates.responseLength !== undefined) config.set('chat.responseLength', updates.responseLength);
    if (updates.streaming !== undefined) config.set('chat.streaming', updates.streaming);
    if (updates.showReasoning !== undefined) config.set('chat.showReasoning', updates.showReasoning);
    if (updates.saveConversations !== undefined) config.set('chat.saveConversations', updates.saveConversations);
  }

  // === AGENTS ===
  getAgentsSettings(): AgentsSettings {
    if (!this.kernel) return this.getDefaultAgents();
    const pluginList = this.kernel.plugins.list();
    return {
      defaultAgent: 'assistant',
      available: pluginList.map(id => ({
        name: id,
        personality: 'default',
        tools: [],
        memory: true,
        permissions: [],
      })),
    };
  }

  updateAgents(updates: Partial<AgentsSettings>): void {
    if (!this.kernel) return;
    const config = this.kernel.config;
    if (updates.defaultAgent) config.set('agents.default', updates.defaultAgent);
  }

  // === SKILLS ===
  getSkillsSettings(): SkillsSettings {
    if (!this.kernel) return this.getDefaultSkills();
    const caps = this.kernel.capabilities.list();
    return {
      items: caps.map(entry => ({
        id: entry.capability.id.split('.')[1] || entry.capability.id,
        name: entry.capability.name,
        enabled: true,
        capabilities: [entry.capability.id],
        plugins: [entry.pluginId],
        permissions: [],
      })),
    };
  }

  updateSkills(updates: Partial<SkillsSettings>): void {
    // Future: enable/disable skills
  }

  // === PERMISSIONS ===
  getPermissionsSettings(): PermissionSettings {
    if (!this.kernel) return this.getDefaultPermissions();
    return {
      browser: { resource: 'browser', action: 'allow' },
      files: { resource: 'files', action: 'ask' },
      location: { resource: 'location', action: 'deny' },
      externalApis: { resource: 'external-apis', action: 'allow' },
    };
  }

  updatePermissions(updates: Partial<PermissionSettings>): void {
    if (!this.kernel) return;
    const config = this.kernel.config;
    if (updates.browser) config.set('permissions.browser', updates.browser.action);
    if (updates.files) config.set('permissions.files', updates.files.action);
    if (updates.location) config.set('permissions.location', updates.location.action);
    if (updates.externalApis) config.set('permissions.externalApis', updates.externalApis.action);
  }

  // === SYSTEM ===
  getSystemSettings(): SystemSettings {
    if (!this.kernel) return this.getDefaultSystem();
    return {
      runtimeOnline: true,
      pluginsLoaded: this.kernel.plugins.list().length,
      providersAvailable: this.providerRegistry?.list().length || 0,
      storageUsed: '0 MB',
      logsEnabled: false,
    };
  }

  // === HELPERS ===
  private getDefaultGeneral(): GeneralSettings {
    return { theme: 'system', language: 'pt-BR', startup: 'dashboard', notifications: true, autoUpdates: true };
  }
  private getDefaultProfile(): ProfileSettings {
    return { name: '', avatar: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, aiNickname: '', primaryGoal: '' };
  }
  private getDefaultMemory(): MemorySettings {
    return { enabled: true, autoSave: true, categories: { preferences: true, projects: true, people: true, knowledge: true }, maxSize: 1000 };
  }
  private getDefaultModels(): ModelsSettings {
    return { chat: { provider: 'mock', model: 'default', contextWindow: 0, estimatedCost: '$0.00', status: 'inactive' }, coding: { provider: 'mock', model: 'default', contextWindow: 0, estimatedCost: '$0.00', status: 'inactive' }, embeddings: { provider: 'mock', model: 'default', contextWindow: 0, estimatedCost: '$0.00', status: 'inactive' } };
  }
  private getDefaultChat(): ChatSettings {
    return { temperature: 0.7, responseLength: 'normal', streaming: true, showReasoning: false, saveConversations: true };
  }
  private getDefaultAgents(): AgentsSettings {
    return { defaultAgent: 'assistant', available: [] };
  }
  private getDefaultSkills(): SkillsSettings {
    return { items: [] };
  }
  private getDefaultPermissions(): PermissionSettings {
    return { browser: { resource: 'browser', action: 'allow' }, files: { resource: 'files', action: 'ask' }, location: { resource: 'location', action: 'deny' }, externalApis: { resource: 'external-apis', action: 'allow' } };
  }
  private getDefaultSystem(): SystemSettings {
    return { runtimeOnline: false, pluginsLoaded: 0, providersAvailable: 0, storageUsed: '0 MB', logsEnabled: false };
  }
}
