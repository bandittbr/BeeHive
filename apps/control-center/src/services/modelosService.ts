/**
 * Serviço de Modelos Virtuais — comunicação com a API do worker.
 */
const WORKER_URL = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '') || 'http://localhost:4000';
const WORKER_TOKEN = import.meta.env.VITE_WORKER_TOKEN ?? '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (WORKER_TOKEN) h['Authorization'] = `Bearer ${WORKER_TOKEN}`;
  return h;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${WORKER_URL}${path}`;
  const res = await fetch(url, { ...options, headers: { ...headers(), ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

// ---- Tipos ----

export interface VirtualModel {
  id: string;
  name: string;
  photoDir: string;
  accounts: { platform: string; accountId: string }[];
  postsPerDay: number;
  times?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface VirtualModelLog {
  id: string;
  modelId: string;
  runAt: number;
  finishedAt?: number;
  photoFile?: string;
  caption?: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
  publishedTo?: string[];
}

// ---- CRUD ----

export interface ModelsListResponse {
  models: VirtualModel[];
}

export interface ModelResponse {
  model: VirtualModel;
}

export async function listModels(): Promise<VirtualModel[]> {
  const res = await api<ModelsListResponse>('/api/modelos');
  return res.models;
}

export async function getModel(id: string): Promise<VirtualModel> {
  const res = await api<ModelResponse>(`/api/modelos/${encodeURIComponent(id)}`);
  return res.model;
}

export async function addModel(data: {
  name: string;
  postsPerDay?: number;
  times?: string;
  active?: boolean;
  accounts?: { platform: string; accountId: string }[];
}): Promise<VirtualModel> {
  const res = await api<ModelResponse>('/api/modelos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.model;
}

export async function updateModel(
  id: string,
  fields: Partial<Pick<VirtualModel, 'name' | 'postsPerDay' | 'times' | 'active' | 'accounts'>>,
): Promise<VirtualModel> {
  const res = await api<ModelResponse>(`/api/modelos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return res.model;
}

export async function deleteModel(id: string): Promise<boolean> {
  const res = await api<{ ok: boolean }>(`/api/modelos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

// ---- Fotos ----

export interface ModelPhotosResponse {
  all: string[];
  unused: string[];
}

export async function listModelPhotos(id: string): Promise<ModelPhotosResponse> {
  return api<ModelPhotosResponse>(`/api/modelos/${encodeURIComponent(id)}/fotos`);
}

// ---- Logs ----

export interface ModelLogsResponse {
  logs: VirtualModelLog[];
}

export async function listModelLogs(id: string): Promise<VirtualModelLog[]> {
  const res = await api<ModelLogsResponse>(`/api/modelos/${encodeURIComponent(id)}/logs`);
  return res.logs;
}

// ---- Tick manual ----

export async function triggerModelosTick(): Promise<boolean> {
  const res = await api<{ ok: boolean }>('/api/modelos/tick', { method: 'POST' });
  return res.ok;
}

// ---- Helpers ----

export function modelStatusLabel(active: boolean): string {
  return active ? 'Ativo' : 'Pausado';
}

export function logStatusLabel(status: VirtualModelLog['status']): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    done: 'Postado',
    error: 'Erro',
  };
  return labels[status] || status;
}

export function logStatusColor(status: VirtualModelLog['status']): string {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    done: '#22c55e',
    error: '#ef4444',
  };
  return colors[status] || '#6b7280';
}
