/**
 * Serviço de Social Scraper — comunicação com a API do worker.
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

export interface ScrapeInstagramResult {
  ok: boolean;
  message: string;
}

export interface ScrapeInstagramRequest {
  profileUrl: string;
  maxPosts?: number;
  outputDir?: string;
}

/**
 * Inicia o scraping de um perfil do Instagram.
 * Roda em background — o resultado é logado no servidor.
 */
export async function scrapeInstagram(req: ScrapeInstagramRequest): Promise<ScrapeInstagramResult> {
  return api<ScrapeInstagramResult>('/api/social/scrape-instagram', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
