// Piloto automático de cortes: fala com o worker (apps/worker/src/index.ts,
// rotas /api/autoclip/*). Mesmo padrão de auth do resto do scheduler (token
// do Cowork Nuvem em Settings, não o login de usuário).
import { getWorkerConfig, isWorkerConfigured } from './worker';

export interface ClipChannel {
  id: string;
  channelUrl: string;
  label?: string;
  active: boolean;
  createdAt: number;
}
export interface ClipConfig {
  active: boolean;
  postsPerDay: number;
  times?: string;
  niche?: string;
  description?: string;
}
export interface ClipHistoryEntry {
  videoId: string;
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

export async function listClipChannels(): Promise<ClipChannel[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/channels`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.channels) ? data.channels : [];
  } catch { return []; }
}

export async function addClipChannel(channelUrl: string, label?: string): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/channels`, { method: 'POST', headers: headers(), body: JSON.stringify({ channelUrl, label }) });
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

export async function getClipConfig(): Promise<ClipConfig | null> {
  if (!isWorkerConfigured()) return null;
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/config`, { headers: headers() });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.config ?? null;
  } catch { return null; }
}

export async function setClipConfig(cfg: ClipConfig): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/config`, { method: 'PUT', headers: headers(), body: JSON.stringify(cfg) });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listClipHistory(): Promise<ClipHistoryEntry[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/history`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.history) ? data.history : [];
  } catch { return []; }
}

export async function runAutoclipNow(): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/autoclip/run-now`, { method: 'POST', headers: headers() });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
