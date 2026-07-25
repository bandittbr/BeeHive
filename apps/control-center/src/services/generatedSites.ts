// Sites/landing pages gerados pelo orquestrador (etapas "coding" viram uma
// pasta única em sites/<timestamp>/index.html no worker — ver runOnWorker
// em orchestrator.ts). Isso vive no disco do worker (Railway) e não tem
// limpeza automática, então essa tela existe pra dar visibilidade e deixar
// apagar o que for acumulando (mesmo padrão de auth do resto do Cowork
// Nuvem: token configurado em Settings, não o login de usuário).
import { getWorkerConfig, isWorkerConfigured } from './worker';

export interface GeneratedSite {
  id: string;
  path: string;
  title: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

function headers(): Record<string, string> {
  const { token } = getWorkerConfig();
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (token) h['authorization'] = `Bearer ${token}`;
  return h;
}

export async function listGeneratedSites(): Promise<GeneratedSite[]> {
  if (!isWorkerConfigured()) return [];
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/generated-sites`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.sites) ? data.sites : [];
  } catch { return []; }
}

export async function deleteGeneratedSite(id: string): Promise<boolean> {
  if (!isWorkerConfigured()) return false;
  const { url } = getWorkerConfig();
  try {
    const res = await fetch(`${url}/api/generated-sites/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return !!data?.ok;
  } catch { return false; }
}
