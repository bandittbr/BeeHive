export interface Project {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  agents: Agent[];
  workflows: Workflow[];
  artifacts: Artifact[];
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'working' | 'waiting' | 'error';
  task: string;
  color: string;
  projectId: string;
  pipeline?: PipelineStep[];
}

export interface PipelineStep {
  id: string;
  label: string;
  type: 'agent' | 'provider' | 'tool' | 'artifact';
  status: 'pending' | 'active' | 'done' | 'error';
}

export interface Workflow {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'scheduled';
  progress: number;
  projectId: string;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  size: string;
  projectId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  projectId: string;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  apiKey?: string;
  models: string[];
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
}

export interface Mission {
  id: string;
  name: string;
  progress: number;
  status: 'running' | 'completed' | 'error' | 'scheduled';
  agents: string[];
  projectId: string;
}

export interface ActivityEvent {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  time: string;
  projectId: string;
}

export interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  language: string;
  notifications: boolean;
}

export interface BusinessModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'ia' | 'conteudo' | 'automacao' | 'marketing' | 'business' | 'dev';
}
