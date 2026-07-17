import type { Workflow } from '../types';
import { useAppStore } from '../stores/appStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const workflowService = {
  async getByProject(projectId: string): Promise<Workflow[]> {
    await delay(150);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.workflows || [];
  },

  async getAll(): Promise<Workflow[]> {
    await delay(150);
    return useAppStore.getState().projects.flatMap(p => p.workflows);
  },

  async create(data: Omit<Workflow, 'id'>): Promise<Workflow> {
    await delay(300);
    const workflow: Workflow = { ...data, id: crypto.randomUUID() };
    useAppStore.getState().updateProject(data.projectId, {
      workflows: [...(useAppStore.getState().projects.find(p => p.id === data.projectId)?.workflows || []), workflow],
    });
    return workflow;
  },
};
