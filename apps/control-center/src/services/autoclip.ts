// Piloto automático de cortes: fala com o worker (apps/worker/src/index.ts,
// rotas /api/autoclip/*). Mesmo padrão de auth do resto do scheduler (token
// do Cowork Nuvem em Settings, não o login de usuário).
// Cada "piloto" é uma automação independente (ex.: Humor, Terror, Tech), com
// seus próprios canais fonte e contas-alvo (escolhidas dentre as cadastradas
// em Settings → Conexões).
import { getWorkerConfig, isWorkerConfigured } from './worker';

export interface ClipPilot {
  id: string;
  name: string;
  niche?: string;
  description?: string;
  active: boolean;
  postsPerDay: number;
  times?: string;
  accountIds: string[];
  createdAt: number;
  updatedAt: number;
}
export interface ClipChannel {
  id: string;
  pilotId: string;
  channelUrl: string;
  label?: string;
  active: boolean;
  createdAt: number;
}
export interface ClipHistoryEntry {
  videoId: string;
  pilotId?: string;
  channelUrl?: string;
  title?: string;
  status: 'done' | 'error' | 'skipped';
  clipsGenerated: number;
  error?: string;
  processedAt: number;
}

function headers(): Record<string, string> {
  const { token } = getWorkerConfig();
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (token) h['authorization'] = `Bearer ${token}`;
  return h;
}

export async function listPilots(): Promise<ClipPilot[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.pilots) ? data.pilots : [];
  } catch { return []; }
}

export async function createPilot(input: { name: string; niche?: string; description?: string; postsPerDay?: number; times?: string; accountIds?: string[] }): Promise<{ ok: boolean; pilot?: ClipPilot; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots`, { method: 'POST', headers: headers(), body: JSON.stringify(input) });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    const data = await res.json();
    return { ok: true, pilot: data.pilot };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updatePilot(id: string, fields: Partial<Omit<ClipPilot, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{ ok: boolean; pilot?: ClipPilot; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(fields) });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    const data = await res.json();
    return { ok: true, pilot: data.pilot };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deletePilot(id: string): Promise<boolean> {
  if (!isWorkerConfigured()) return false;
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots/${id}`, { method: 'DELETE', headers: headers() });
    return res.ok;
  } catch { return false; }
}

export async function listPilotChannels(pilotId: string): Promise<ClipChannel[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots/${pilotId}/channels`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.channels) ? data.channels : [];
  } catch { return []; }
}

export async function addPilotChannel(pilotId: string, channelUrl: string, label?: string): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots/${pilotId}/channels`, { method: 'POST', headers: headers(), body: JSON.stringify({ channelUrl, label }) });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function removeClipChannel(id: string): Promise<boolean> {
  if (!isWorkerConfigured()) return false;
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/channels/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() });
    return res.ok;
  } catch { return false; }
}

export async function listPilotHistory(pilotId: string): Promise<ClipHistoryEntry[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots/${pilotId}/history`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.history) ? data.history : [];
  } catch { return []; }
}

export async function runPilotNow(pilotId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/pilots/${pilotId}/run-now`, { method: 'POST', headers: headers() });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
