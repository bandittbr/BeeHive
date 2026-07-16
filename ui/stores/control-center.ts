// Control Center — Estado persistente por seção
// Persistido em localStorage com chave "beehive-settings"

export interface ControlCenterState {
  general: GeneralSettings;
  profile: ProfileSettings;
  memory: MemorySettings;
  models: ModelsSettings;
  chat: ChatSettings;
  agents: AgentsSettings;
  skills: SkillsSettings;
  permissions: PermissionSettings;
  keyboard: KeyboardSettings;
  archived: ArchivedSettings;
  system: SystemSettings;
}

export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  startup: 'last-session' | 'dashboard' | 'default-agent';
  notifications: boolean;
  autoUpdates: boolean;
}

export interface ProfileSettings {
  name: string;
  avatar: string;
  timezone: string;
  aiNickname: string;
  primaryGoal: string;
}

export interface MemorySettings {
  enabled: boolean;
  autoSave: boolean;
  categories: {
    preferences: boolean;
    projects: boolean;
    people: boolean;
    knowledge: boolean;
  };
  maxSize: number;
}

export interface ModelConfig {
  provider: string;
  model: string;
  contextWindow: number;
  estimatedCost: string;
  status: 'active' | 'inactive';
}

export interface ModelsSettings {
  chat: ModelConfig;
  coding: ModelConfig;
  embeddings: ModelConfig;
}

export interface ChatSettings {
  temperature: number;
  responseLength: 'short' | 'normal' | 'detailed';
  streaming: boolean;
  showReasoning: boolean;
  saveConversations: boolean;
}

export interface AgentConfig {
  name: string;
  personality: string;
  tools: string[];
  memory: boolean;
  permissions: string[];
}

export interface AgentsSettings {
  defaultAgent: string;
  available: AgentConfig[];
}

export interface SkillConfig {
  id: string;
  name: string;
  enabled: boolean;
  capabilities: string[];
  plugins: string[];
  permissions: string[];
}

export interface SkillsSettings {
  items: SkillConfig[];
}

export interface PermissionConfig {
  resource: string;
  action: 'allow' | 'ask' | 'deny';
}

export interface PermissionSettings {
  browser: PermissionConfig;
  files: PermissionConfig;
  location: PermissionConfig;
  externalApis: PermissionConfig;
}

export interface KeyboardShortcut {
  key: string;
  description: string;
}

export interface KeyboardSettings {
  shortcuts: KeyboardShortcut[];
}

export interface ArchivedSettings {
  conversations: string[];
  workflows: string[];
  projects: string[];
  artifacts: string[];
}

export interface SystemSettings {
  runtimeOnline: boolean;
  pluginsLoaded: number;
  providersAvailable: number;
  storageUsed: string;
  logsEnabled: boolean;
}

const STORAGE_KEY = 'beehive-settings';

function getDefaultState(): ControlCenterState {
  return {
    general: {
      theme: 'system',
      language: 'pt-BR',
      startup: 'dashboard',
      notifications: true,
      autoUpdates: true,
    },
    profile: {
      name: '',
      avatar: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      aiNickname: '',
      primaryGoal: '',
    },
    memory: {
      enabled: true,
      autoSave: true,
      categories: {
        preferences: true,
        projects: true,
        people: true,
        knowledge: true,
      },
      maxSize: 1000,
    },
    models: {
      chat: {
        provider: 'openrouter',
        model: 'meta-llama/llama-3-8b-instruct:free',
        contextWindow: 8192,
        estimatedCost: '$0.00',
        status: 'active',
      },
      coding: {
        provider: 'openrouter',
        model: 'meta-llama/llama-3-8b-instruct:free',
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
    },
    chat: {
      temperature: 0.7,
      responseLength: 'normal',
      streaming: true,
      showReasoning: false,
      saveConversations: true,
    },
    agents: {
      defaultAgent: 'assistant',
      available: [
        { name: 'assistant', personality: 'helpful', tools: [], memory: true, permissions: [] },
        { name: 'research', personality: 'analytical', tools: ['browser'], memory: true, permissions: [] },
        { name: 'coding', personality: 'precise', tools: ['terminal'], memory: false, permissions: [] },
      ],
    },
    skills: {
      items: [
        { id: 'browser', name: 'Browser', enabled: true, capabilities: ['browser.navigate', 'browser.scrape', 'browser.screenshot'], plugins: ['browser'], permissions: ['browser:navigate'] },
        { id: 'research', name: 'Research', enabled: true, capabilities: ['chat.generate'], plugins: ['foundation'], permissions: ['ai:chat'] },
        { id: 'code', name: 'Code Assistant', enabled: false, capabilities: ['tool.execute'], plugins: ['foundation'], permissions: ['tool:execute'] },
        { id: 'image', name: 'Image Creator', enabled: false, capabilities: ['image.generate'], plugins: [], permissions: [] },
        { id: 'video', name: 'Video Creator', enabled: false, capabilities: ['video.generate'], plugins: [], permissions: [] },
      ],
    },
    permissions: {
      browser: { resource: 'browser', action: 'allow' },
      files: { resource: 'files', action: 'ask' },
      location: { resource: 'location', action: 'deny' },
      externalApis: { resource: 'external-apis', action: 'allow' },
    },
    keyboard: {
      shortcuts: [
        { key: 'Ctrl+Space', description: 'Open BeeHive' },
        { key: 'Ctrl+K', description: 'New conversation' },
        { key: 'Ctrl+Shift+P', description: 'Command palette' },
      ],
    },
    archived: {
      conversations: [],
      workflows: [],
      projects: [],
      artifacts: [],
    },
    system: {
      runtimeOnline: true,
      pluginsLoaded: 0,
      providersAvailable: 0,
      storageUsed: '0 MB',
      logsEnabled: false,
    },
  };
}

export function loadControlCenterState(): ControlCenterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const defaults = getDefaultState();
      // Merge: saved values override defaults
      return {
        general: { ...defaults.general, ...saved.general },
        profile: { ...defaults.profile, ...(saved.profile || {}) },
        memory: { ...defaults.memory, ...saved.memory },
        models: { ...defaults.models, ...saved.models },
        chat: { ...defaults.chat, ...saved.chat },
        agents: { ...defaults.agents, ...saved.agents },
        skills: { ...defaults.skills, ...saved.skills },
        permissions: { ...defaults.permissions, ...saved.permissions },
        keyboard: { ...defaults.keyboard, ...saved.keyboard },
        archived: { ...defaults.archived, ...saved.archived },
        system: { ...defaults.system, ...saved.system },
      };
    }
  } catch {
    // Corrupted data — reset
  }
  return getDefaultState();
}

export function saveControlCenterState(state: ControlCenterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full — ignore
  }
}
