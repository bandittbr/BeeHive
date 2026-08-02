// Cortes API Service — Gerencia projetos, canais, contas sociais e configurações
import type {
  CorteChannel,
  CorteSocialAccount,
  CorteProject,
  CorteClip,
  CorteSettings,
  NewProjectForm,
} from '../types/cortes';

const API_BASE = (import.meta.env.VITE_CORTES_API_BASE_URL || 'https://beehive-production-d895.up.railway.app/api').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function requestPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Canais ────────────────────────────────────────────────────────────────────

export async function listChannels(): Promise<CorteChannel[]> {
  return request<CorteChannel[]>('/cortes/channels');
}

export async function createChannel(data: { name: string; category?: string; description?: string }): Promise<CorteChannel> {
  return requestPost<CorteChannel>('/cortes/channels', data);
}

export async function updateChannel(id: string, data: Partial<CorteChannel>): Promise<CorteChannel> {
  return request<CorteChannel>(`/cortes/channels/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteChannel(id: string): Promise<void> {
  await request(`/cortes/channels/${id}`, { method: 'DELETE' });
}

// ── Redes Sociais ─────────────────────────────────────────────────────────────

export interface CreateSocialAccountInput {
  platform: string;
  accountId: string;
  displayName?: string;
  handle?: string;
}

export async function listSocialAccounts(): Promise<CorteSocialAccount[]> {
  return request<CorteSocialAccount[]>('/cortes/social-accounts');
}

export async function createSocialAccount(data: CreateSocialAccountInput): Promise<CorteSocialAccount> {
  return requestPost<CorteSocialAccount>('/cortes/social-accounts', data);
}

export async function deleteSocialAccount(id: string): Promise<void> {
  await request(`/cortes/social-accounts/${id}`, { method: 'DELETE' });
}

// ── Projetos ──────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<CorteProject[]> {
  return request<CorteProject[]>('/cortes/projects');
}

export async function getProject(id: string): Promise<CorteProject> {
  return request<CorteProject>(`/cortes/projects/${id}`);
}

export async function createProject(data: NewProjectForm): Promise<CorteProject> {
  return requestPost<CorteProject>('/cortes/projects', data);
}

export async function updateProject(id: string, data: Partial<CorteProject>): Promise<CorteProject> {
  return request<CorteProject>(`/cortes/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await request(`/cortes/projects/${id}`, { method: 'DELETE' });
}

export async function generateCortes(input: {
  projectId: string;
  url: string;
}): Promise<{ jobId: string }> {
  return requestPost<{ jobId: string }>('/cortes/generate', input);
}

export async function getGenerateJob(jobId: string): Promise<{ status: string; progress?: number }> {
  return request<{ status: string; progress?: number }>(`/cortes/jobs/${jobId}`);
}

// ── Cortes (Clipes) ───────────────────────────────────────────────────────────

export async function updateClip(id: string, data: Partial<CorteClip>): Promise<CorteClip> {
  return request<CorteClip>(`/cortes/clips/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function publishClip(id: string): Promise<{ success: boolean; url?: string; error?: string }> {
  return request<{ success: boolean; url?: string; error?: string }>(`/cortes/clips/${id}/publish`, {
    method: 'POST',
  });
}

// ── Configurações ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<CorteSettings> {
  return request<CorteSettings>('/cortes/settings');
}

export async function updateSettings(data: Partial<CorteSettings>): Promise<CorteSettings> {
  return requestPost<CorteSettings>('/cortes/settings', data);
}
