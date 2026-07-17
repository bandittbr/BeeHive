import type { Project, Agent, Workflow, Artifact } from '../types';
import { useAppStore } from '../stores/appStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const projectService = {
  async getAll(): Promise<Project[]> {
    await delay(150);
    return useAppStore.getState().projects;
  },

  async getById(id: string): Promise<Project | null> {
    await delay(100);
    return useAppStore.getState().projects.find(p => p.id === id) || null;
  },

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'agents' | 'workflows' | 'artifacts'>): Promise<Project> {
    await delay(300);
    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      agents: [],
      workflows: [],
      artifacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useAppStore.getState().addProject(project);
    return project;
  },

  async update(id: string, updates: Partial<Project>): Promise<void> {
    await delay(200);
    useAppStore.getState().updateProject(id, { ...updates, updatedAt: new Date().toISOString() });
  },

  async delete(id: string): Promise<void> {
    await delay(200);
    useAppStore.getState().deleteProject(id);
  },

  async getAgents(projectId: string): Promise<Agent[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.agents || [];
  },

  async getWorkflows(projectId: string): Promise<Workflow[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.workflows || [];
  },

  async getArtifacts(projectId: string): Promise<Artifact[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.artifacts || [];
  },
};
