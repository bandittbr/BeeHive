import { create } from 'zustand';
import type { Project, Conversation, Message, Provider, Model, SettingsState, Mission, ActivityEvent, Workflow, Artifact, Agent, BizAccount, SocialAccount } from '../types';

interface AppState {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Conversations
  conversations: Conversation[];
  currentConversation: Conversation | null;
  setCurrentConversation: (conv: Conversation | null) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;

  // Messages
  messages: Message[];
  addMessage: (msg: Message) => void;
  getMessagesByConversation: (conversationId: string) => Message[];

  // Providers
  providers: Provider[];
  currentProvider: Provider | null;
  setCurrentProvider: (provider: Provider | null) => void;
  updateProvider: (id: string, updates: Partial<Provider>) => void;

  // Models
  models: Model[];
  currentModel: Model | null;
  setCurrentModel: (model: Model | null) => void;

  // Settings
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;

  // Missions
  missions: Mission[];

  // Events
  events: ActivityEvent[];

  // Negócios (redes sociais autônomas)
  bizAccounts: BizAccount[];
  addBizAccount: (biz: BizAccount) => void;
  updateBizAccount: (id: string, updates: Partial<BizAccount>) => void;
  deleteBizAccount: (id: string) => void;
  addSocialAccount: (bizId: string, social: SocialAccount) => void;
  removeSocialAccount: (bizId: string, socialId: string) => void;
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1', name: 'BeeHive', icon: '🐝', description: 'Plataforma de IA modular', status: 'active',
    agents: [
      { id: 'a1', name: 'Marketing Agent', status: 'working', task: 'Criando campanha para Instagram', color: '#a855f7', projectId: '1',
        pipeline: [
          { id: 'p1', label: 'Thinking', type: 'agent', status: 'done' },
          { id: 'p2', label: 'Research', type: 'agent', status: 'done' },
          { id: 'p3', label: 'Browser', type: 'tool', status: 'done' },
          { id: 'p4', label: 'Claude Sonnet', type: 'provider', status: 'active' },
          { id: 'p5', label: 'Image Gen', type: 'tool', status: 'pending' },
          { id: 'p6', label: 'Artifact', type: 'artifact', status: 'pending' },
        ]
      },
      { id: 'a2', name: 'Research Agent', status: 'running', task: 'Analisando concorrentes', color: '#3b82f6', projectId: '1' },
      { id: 'a3', name: 'Browser Agent', status: 'idle', task: 'Ocioso', color: '#10b981', projectId: '1' },
    ],
    workflows: [
      { id: 'w1', name: 'Deploy Pipeline', status: 'running', progress: 64, projectId: '1' },
      { id: 'w2', name: 'Code Review', status: 'completed', progress: 100, projectId: '1' },
    ],
    artifacts: [
      { id: 'ar1', name: 'architecture-v1.png', type: 'Image', size: '2.4 MB', projectId: '1', createdAt: '2024-01-15' },
      { id: 'ar2', name: 'deploy-config.yaml', type: 'Code', size: '1.2 KB', projectId: '1', createdAt: '2024-01-14' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-01-15',
  },
  {
    id: '2', name: 'TradeAI', icon: '📈', description: 'Trading automatizado', status: 'active',
    agents: [
      { id: 'b1', name: 'Trade Agent', status: 'working', task: 'Monitorando BTC/USDT', color: '#f59e0b', projectId: '2' },
      { id: 'b2', name: 'Risk Agent', status: 'idle', task: 'Ocioso', color: '#ef4444', projectId: '2' },
    ],
    workflows: [
      { id: 'x1', name: 'Trade BTC', status: 'error', progress: 45, projectId: '2' },
    ],
    artifacts: [],
    createdAt: '2024-01-05', updatedAt: '2024-01-15',
  },
  {
    id: '3', name: 'Marketing', icon: '📢', description: 'Campanhas e conteúdo', status: 'active',
    agents: [
      { id: 'c1', name: 'Content Agent', status: 'working', task: 'Gerando posts para Instagram', color: '#ec4899', projectId: '3' },
      { id: 'c2', name: 'SEO Agent', status: 'running', task: 'Otimizando artigos', color: '#14b8a6', projectId: '3' },
    ],
    workflows: [
      { id: 'z1', name: 'Marketing Diário', status: 'running', progress: 64, projectId: '3' },
    ],
    artifacts: [
      { id: 'w1', name: 'post-campanha.png', type: 'Image', size: '156 KB', projectId: '3', createdAt: '2024-01-15' },
    ],
    createdAt: '2024-01-10', updatedAt: '2024-01-15',
  },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Análise de Mercado Q4', preview: 'Dados compilados com sucesso...', projectId: '1', starred: true, createdAt: '2024-01-15', updatedAt: '2024-01-15' },
  { id: '2', title: 'Campanha Instagram', preview: '5 posts criados para...', projectId: '3', starred: false, createdAt: '2024-01-14', updatedAt: '2024-01-14' },
  { id: '3', title: 'Code Review Módulo', preview: 'Refatoraçào sugerida...', projectId: '1', starred: false, createdAt: '2024-01-13', updatedAt: '2024-01-13' },
  { id: '4', title: 'Trade Analysis', preview: 'Sinal de compra detectado...', projectId: '2', starred: true, createdAt: '2024-01-12', updatedAt: '2024-01-12' },
];

const INITIAL_MESSAGES: Message[] = [
  { id: '1', conversationId: '1', role: 'user', content: 'Analise o desempenho da campanha de marketing do último trimestre.', createdAt: '2024-01-15T10:30:00' },
  { id: '2', conversationId: '1', role: 'assistant', content: 'Análise concluída.\n\n**Métricas:**\n- ROI: 4.2x\n- CAC: R$ 42.30\n- Conversões: +23%', agent: 'Marketing Agent', createdAt: '2024-01-15T10:31:00' },
];

const INITIAL_PROVIDERS: Provider[] = [
  { id: 'openrouter', name: 'OpenRouter', status: 'connected', models: ['Claude Sonnet', 'GPT-4o', 'Llama 3 70B'] },
  { id: 'openai', name: 'OpenAI', status: 'disconnected', models: ['GPT-4o', 'GPT-3.5'] },
  { id: 'anthropic', name: 'Anthropic', status: 'disconnected', models: ['Claude Sonnet', 'Claude Opus'] },
];

const INITIAL_MODELS: Model[] = [
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'openrouter', contextWindow: 200000 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openrouter', contextWindow: 128000 },
  { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'openrouter', contextWindow: 8192 },
];

export const useAppStore = create<AppState>((set, get) => ({
  // Projects
  projects: INITIAL_PROJECTS,
  currentProject: INITIAL_PROJECTS[0],
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  updateProject: (id, updates) => set((s) => ({
    projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p),
    currentProject: s.currentProject?.id === id ? { ...s.currentProject, ...updates } : s.currentProject,
  })),
  deleteProject: (id) => set((s) => ({
    projects: s.projects.filter(p => p.id !== id),
    currentProject: s.currentProject?.id === id ? null : s.currentProject,
  })),

  // Conversations
  conversations: INITIAL_CONVERSATIONS,
  currentConversation: INITIAL_CONVERSATIONS[0],
  setCurrentConversation: (conv) => set({ currentConversation: conv }),
  addConversation: (conv) => set((s) => ({ conversations: [conv, ...s.conversations] })),
  updateConversation: (id, updates) => set((s) => ({
    conversations: s.conversations.map(c => c.id === id ? { ...c, ...updates } : c),
  })),
  deleteConversation: (id) => set((s) => ({
    conversations: s.conversations.filter(c => c.id !== id),
    currentConversation: s.currentConversation?.id === id ? null : s.currentConversation,
  })),

  // Messages
  messages: INITIAL_MESSAGES,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  getMessagesByConversation: (conversationId) => get().messages.filter(m => m.conversationId === conversationId),

  // Providers
  providers: INITIAL_PROVIDERS,
  currentProvider: INITIAL_PROVIDERS[0],
  setCurrentProvider: (provider) => set({ currentProvider: provider }),
  updateProvider: (id, updates) => set((s) => ({
    providers: s.providers.map(p => p.id === id ? { ...p, ...updates } : p),
  })),

  // Models
  models: INITIAL_MODELS,
  currentModel: INITIAL_MODELS[0],
  setCurrentModel: (model) => set({ currentModel: model }),

  // Settings
  settings: { theme: 'dark', language: 'pt-BR', notifications: true },
  updateSettings: (updates) => set((s) => ({ settings: { ...s.settings, ...updates } })),

  // Missions
  missions: [
    { id: 'm1', name: 'Marketing Diário', progress: 64, status: 'running', agents: ['Marketing Agent'], projectId: '3' },
    { id: 'm2', name: 'Pesquisa Empresa X', progress: 38, status: 'running', agents: ['Research Agent'], projectId: '1' },
    { id: 'm3', name: 'Deploy Pipeline', progress: 64, status: 'running', agents: ['Browser Agent'], projectId: '1' },
    { id: 'm4', name: 'Trade BTC', progress: 45, status: 'error', agents: ['Trade Agent'], projectId: '2' },
  ],

  // Events
  events: [
    { id: 'e1', type: 'success', text: 'Publicaçào YouTube concluída', time: '2 min', projectId: '3' },
    { id: 'e2', type: 'success', text: 'Workflow "Marketing Diário" atualizado', time: '15 min', projectId: '3' },
    { id: 'e3', type: 'warning', text: 'OpenRouter com latência alta', time: '30 min', projectId: '1' },
    { id: 'e4', type: 'success', text: 'Browser scraping finalizado', time: '1h', projectId: '1' },
    { id: 'e5', type: 'error', text: 'Trade BTC — conexào perdida', time: '2h', projectId: '2' },
  ],

  // Negócios (redes sociais autônomas)
  bizAccounts: [],
  addBizAccount: (biz) => set((s) => ({ bizAccounts: [...s.bizAccounts, biz] })),
  updateBizAccount: (id, updates) => set((s) => ({
    bizAccounts: s.bizAccounts.map(b => b.id === id ? { ...b, ...updates } : b),
  })),
  deleteBizAccount: (id) => set((s) => ({ bizAccounts: s.bizAccounts.filter(b => b.id !== id) })),
  addSocialAccount: (bizId, social) => set((s) => ({
    bizAccounts: s.bizAccounts.map(b => b.id === bizId ? { ...b, socialAccounts: [...b.socialAccounts, social] } : b),
  })),
  removeSocialAccount: (bizId, socialId) => set((s) => ({
    bizAccounts: s.bizAccounts.map(b => b.id === bizId ? { ...b, socialAccounts: b.socialAccounts.filter(sa => sa.id !== socialId) } : b),
  })),
}));

