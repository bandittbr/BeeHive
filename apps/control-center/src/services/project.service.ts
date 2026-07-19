import type { Project, Agent, Workflow, Artifact, Pipeline, PipelineNode, PipelineEdge } from '../types';
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

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'agents' | 'workflows' | 'artifacts' | 'pipelines'>): Promise<Project> {
    await delay(300);
    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      agents: [],
      workflows: [],
      artifacts: [],
      pipelines: [],
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

  // Pipeline methods
  async getPipelines(projectId: string): Promise<Pipeline[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.pipelines || [];
  },

  async getPipelineById(projectId: string, pipelineId: string): Promise<Pipeline | null> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.pipelines?.find(p => p.id === pipelineId) || null;
  },

  async createPipeline(projectId: string, data: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt' | 'nodes' | 'edges'>): Promise<Pipeline> {
    await delay(300);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');
    
    const pipeline: Pipeline = {
      ...data,
      id: crypto.randomUUID(),
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    useAppStore.getState().updateProject(projectId, {
      pipelines: [...(project.pipelines || []), pipeline],
      updatedAt: new Date().toISOString()
    });
    return pipeline;
  },

  async updatePipeline(projectId: string, pipelineId: string, updates: Partial<Pipeline>): Promise<void> {
    await delay(200);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');
    
    const pipelineIndex = project.pipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) throw new Error('Pipeline não encontrada');
    
    const updatedPipelines = [...project.pipelines];
    updatedPipelines[pipelineIndex] = { 
      ...updatedPipelines[pipelineIndex], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    useAppStore.getState().updateProject(projectId, {
      pipelines: updatedPipelines,
      updatedAt: new Date().toISOString()
    });
  },

  async deletePipeline(projectId: string, pipelineId: string): Promise<void> {
    await delay(200);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');
    
    const updatedPipelines = project.pipelines.filter(p => p.id !== pipelineId);
    useAppStore.getState().updateProject(projectId, {
      pipelines: updatedPipelines,
      updatedAt: new Date().toISOString()
    });
  },

  async updatePipelineNodes(projectId: string, pipelineId: string, nodes: any[]): Promise<void> {
    await delay(200);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');
    
    const pipelineIndex = project.pipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) throw new Error('Pipeline não encontrada');
    
    const updatedPipelines = [...project.pipelines];
    updatedPipelines[pipelineIndex] = {
      ...updatedPipelines[pipelineIndex],
      nodes,
      updatedAt: new Date().toISOString()
    };
    
    useAppStore.getState().updateProject(projectId, {
      pipelines: updatedPipelines,
      updatedAt: new Date().toISOString()
    });
  },

  async updatePipelineEdges(projectId: string, pipelineId: string, edges: any[]): Promise<void> {
    await delay(200);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');
    
    const pipelineIndex = project.pipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) throw new Error('Pipeline não encontrada');
    
    const updatedPipelines = [...project.pipelines];
    updatedPipelines[pipelineIndex] = {
      ...updatedPipelines[pipelineIndex],
      edges,
      updatedAt: new Date().toISOString()
    };
    
    useAppStore.getState().updateProject(projectId, {
      pipelines: updatedPipelines,
      updatedAt: new Date().toISOString()
    });
},

  async getAgents(projectId: string): Promise<Agent[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.agents || [];
  },

  async getWorkflows(projectId: string): Promise<any[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.workflows || [];
  },

  async getArtifacts(projectId: string): Promise<any[]> {
    await delay(100);
    const project = useAppStore.getState().projects.find(p => p.id === projectId);
    return project?.artifacts || [];
  },
};