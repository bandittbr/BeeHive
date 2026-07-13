import { useState, useEffect, useCallback } from 'react';

const API = '/api/shorts';

export interface ShortsAgent {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  niche: string;
  defaultProviderId: string;
  defaultModel?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccount {
  id: string;
  agentId: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  accountName: string;
  connectedAt: string;
  active: boolean;
}

export interface AgentDetail {
  agent: ShortsAgent;
  socialAccounts: SocialAccount[];
  activeJobs: number;
  totalClips: number;
  metrics: { totalViews: number; totalLikes: number; totalComments: number; totalShares: number };
  recentJobs: PipelineJob[];
}

export interface PipelineJob {
  id: string;
  agentId: string;
  youtubeUrl: string;
  status: string;
  progress: number;
  numClips: number;
  providerId: string;
  model?: string;
  language: string;
  errorMessage: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  clips?: PipelineClip[];
}

export interface PipelineClip {
  id: string;
  jobId: string;
  agentId: string;
  title: string;
  description: string;
  hashtags: string[];
  startTime: number;
  endTime: number;
  score: number;
  hookSentence: string;
  viralityReason: string;
  clipPath: string;
  thumbnailPath: string;
  subtitlePath: string;
  duration: number;
  status: string;
  createdAt: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<ShortsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/agents`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setAgents(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = useCallback(async (data: { name: string; description?: string; niche?: string; defaultProviderId?: string; defaultModel?: string }) => {
    const res = await fetch(`${API}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const agent = await res.json();
    setAgents(prev => [agent, ...prev]);
    return agent;
  }, []);

  const updateAgent = useCallback(async (id: string, data: Partial<ShortsAgent>) => {
    const res = await fetch(`${API}/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const updated = await res.json();
    setAgents(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const deleteAgent = useCallback(async (id: string) => {
    const res = await fetch(`${API}/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    setAgents(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAgentDetail = useCallback(async (id: string): Promise<AgentDetail> => {
    const res = await fetch(`${API}/agents/${id}`);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  }, []);

  return { agents, loading, error, fetchAgents, createAgent, updateAgent, deleteAgent, getAgentDetail };
}

export function usePipeline() {
  const [jobs, setJobs] = useState<PipelineJob[]>([]);

  const startJob = useCallback(async (data: { agentId: string; youtubeUrl: string; numClips?: number; providerId?: string; model?: string; language?: string }) => {
    const res = await fetch(`${API}/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const job = await res.json();
    setJobs(prev => [job, ...prev]);
    return job;
  }, []);

  const getJobStatus = useCallback(async (id: string): Promise<PipelineJob> => {
    const res = await fetch(`${API}/pipeline/${id}`);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  }, []);

  const getAgentJobs = useCallback(async (agentId: string) => {
    const res = await fetch(`${API}/pipeline/agent/${agentId}`);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const data = await res.json();
    setJobs(data);
    return data;
  }, []);

  const cancelJob = useCallback(async (id: string) => {
    const res = await fetch(`${API}/pipeline/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
  }, []);

  const publishClip = useCallback(async (clipId: string, platform?: string) => {
    const res = await fetch(`${API}/publish/clip/${clipId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  }, []);

  return { jobs, startJob, getJobStatus, getAgentJobs, cancelJob, publishClip };
}

export function useMetrics() {
  const getSummary = useCallback(async (agentId: string) => {
    const res = await fetch(`${API}/metrics/${agentId}/summary`);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  }, []);

  const getHistory = useCallback(async (agentId: string) => {
    const res = await fetch(`${API}/metrics/${agentId}`);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  }, []);

  const getPublishHistory = useCallback(async (agentId?: string) => {
    const url = agentId ? `${API}/publish/history?agentId=${agentId}` : `${API}/publish/history`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  }, []);

  return { getSummary, getHistory, getPublishHistory };
}
