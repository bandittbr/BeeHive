// Serviço de agendamento: fala com o worker para postagem automática.
// Envia as credenciais ao servidor (uma vez) e enfileira posts com horário.
import { getWorkerConfig, isWorkerConfigured } from './worker';
import { getYoutubeCreds, hasYoutubeCreds } from './credentials';

export interface ScheduledPost {
  id: string;
  platform: 'youtube';
  file: string;
  title: string;
  description: string;
  tags: string[];
  at: number;
  status: 'pending' | 'publishing' | 'done' | 'error';
  url?: string;
  error?: string;
  createdAt: number;
}

function headers(): Record<string, string> {
  const { token } = getWorkerConfig();
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (token) h['authorization'] = `Bearer ${token}`;
  return h;
}

// Envia as credenciais do YouTube ao servidor para ele poder postar sozinho.
export async function enableAutoPosting(): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  if (!hasYoutubeCreds()) return { ok: false, error: 'Cadastre as credenciais do YouTube primeiro.' };
  const { url } = getWorkerConfig();
  const c = getYoutubeCreds();
  try {
    const res = await fetch(`${url}/creds/youtube`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ clientId: c.clientId, clientSecret: c.clientSecret, refreshToken: c.refreshToken, privacyStatus: c.privacyStatus ?? 'public' }),
    });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function isAutoPostingEnabled(): Promise<boolean> {
  if (!isWorkerConfigured()) return false;
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/creds/youtube`, { headers: headers() });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return !!data?.configured;
  } catch {
    return false;
  }
}

export async function schedulePost(p: { file: string; title: string; description?: string; tags?: string[]; at: number }): Promise<{ ok: boolean; error?: string }> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Worker não configurado.' };
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/schedule`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ file: p.file, title: p.title, description: p.description ?? '', tags: p.tags ?? [], at: p.at }),
    });
    if (!res.ok) return { ok: false, error: `Worker respondeu ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function listSchedule(): Promise<ScheduledPost[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/schedule`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.posts) ? data.posts : [];
  } catch {
    return [];
  }
}

export async function cancelSchedule(id: string): Promise<boolean> {
  if (!isWorkerConfigured()) return false;
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/schedule/${id}`, { method: 'DELETE', headers: headers() });
    return res.ok;
  } catch {
    return false;
  }
}

// Distribui N clipes pelos horários do dia (ex: ["12:00","18:00","21:00"]).
// Se não houver horários, gera a partir de postsPerDay espalhando ao longo do dia.
// Começa do próximo horário livre e avança de dia quando esgotam os slots.
export function computeSlots(count: number, times: string[], postsPerDay: number, from = new Date()): number[] {
  let slots = parseTimes(times);
  if (slots.length === 0) slots = defaultTimes(Math.max(1, postsPerDay || 1));
  const out: number[] = [];
  let dayOffset = 0;
  let idx = 0;
  while (out.length < count) {
    const base = new Date(from);
    base.setDate(base.getDate() + dayOffset);
    const [h, m] = slots[idx];
    base.setHours(h, m, 0, 0);
    if (base.getTime() > from.getTime()) out.push(base.getTime());
    idx++;
    if (idx >= slots.length) { idx = 0; dayOffset++; }
    // trava de segurança
    if (dayOffset > 400) break;
  }
  return out;
}

function parseTimes(times: string[]): [number, number][] {
  const src = (times || []).join(',');
  const matches = src.match(/\d{1,2}:\d{2}/g) || [];
  return matches
    .map((t) => t.split(':').map(Number) as [number, number])
    .filter(([h, m]) => h >= 0 && h < 24 && m >= 0 && m < 60);
}

function defaultTimes(n: number): [number, number][] {
  // espalha n horários entre 09h e 21h
  const start = 9, end = 21;
  if (n === 1) return [[12, 0]];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => [Math.round(start + i * step), 0] as [number, number]);
}
