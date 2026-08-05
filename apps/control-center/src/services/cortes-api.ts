// Cortes API Service — Gerencia projetos, canais, contas sociais e configurações
import type {
  CorteChannel,
  CorteSocialAccount,
  CorteProject,
  CorteClip,
  CorteSettings,
  NewProjectForm,
} from '../types/cortes';

export const API_BASE = (import.meta.env.VITE_CORTES_API_BASE_URL || 'https://beehive-production-3701.up.railway.app/api').replace(/\/$/, '');
export const WORKER_BASE_URL = API_BASE.replace(/\/api$/, '');

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
  channelId: string;
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
  executionMode?: 'cloud' | 'connector';
}): Promise<{ jobId: string }> {
  return requestPost<{ jobId: string }>('/cortes/generate', input);
}

export function uploadCorteVideo(file: File, onProgress?: (percent: number) => void): Promise<{ sourceUrl: string; sourceFileId?: string; fileName: string; size: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${WORKER_BASE_URL}/api/cortes/upload`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', file.name);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100))); };
    xhr.onerror = () => reject(new Error('Não foi possível enviar o vídeo. Verifique sua conexão e tente novamente.'));
    xhr.onload = () => {
      let body: { sourceUrl?: string; sourceFileId?: string; fileName?: string; size?: number; error?: string } = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* resposta inválida */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.sourceUrl) resolve(body as { sourceUrl: string; sourceFileId?: string; fileName: string; size: number });
      else reject(new Error(body.error || `Falha ao enviar o vídeo (HTTP ${xhr.status}).`));
    };
    xhr.send(file);
  });
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

export async function scheduleClip(id: string, scheduledAt: string): Promise<CorteClip> {
  return requestPost<CorteClip>(`/cortes/clips/${id}/schedule`, { scheduledAt });
}
export async function scheduleProjectClips(projectId: string, postsPerDay: number, times: string[]): Promise<{ ok: boolean; scheduled: CorteClip[] }> {
  return requestPost<{ ok: boolean; scheduled: CorteClip[] }>(`/cortes/projects/${projectId}/schedule`, { postsPerDay, times });
}
// ── Configurações ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<CorteSettings> {
  return request<CorteSettings>('/cortes/settings');
}

export async function updateSettings(data: Partial<CorteSettings>): Promise<CorteSettings> {
  return requestPost<CorteSettings>('/cortes/settings', data);
}
