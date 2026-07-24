// Cliente do BeeHive Cowork Nuvem (worker).
// Guarda URL+token localmente e despacha jobs, acompanhando via poll.
// Usado pelo orquestrador para executar etapas que exigem runtime real.

const LS_URL = 'beehive.worker.url';
const LS_TOKEN = 'beehive.worker.token';

export type WorkerJobType = 'shell' | 'writeFile' | 'readFile' | 'git' | 'browser';

export interface WorkerJob {
  type: WorkerJobType;
  payload: Record<string, unknown>;
  cwd?: string;
  label?: string;
}

export interface WorkerJobResult {
  status: 'done' | 'error';
  output: string;
  result?: unknown;
  error?: string;
  exitCode?: number;
}

// Garante que a URL tenha esquema (https://). Sem isso, o fetch vira caminho
// relativo e bate no próprio site (Vercel), retornando 405 no POST.
function normalizeUrl(raw: string): string {
  let u = (raw || '').trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

export function getWorkerConfig(): { url: string; token: string } {
  try {
    return {
      url: normalizeUrl(localStorage.getItem(LS_URL) ?? ''),
      token: (localStorage.getItem(LS_TOKEN) ?? '').trim(),
    };
  } catch {
    return { url: '', token: '' };
  }
}

export function setWorkerConfig(url: string, token: string): void {
  try {
    localStorage.setItem(LS_URL, normalizeUrl(url));
    localStorage.setItem(LS_TOKEN, token.trim());
  } catch {
    /* ignore */
  }
}

export function isWorkerConfigured(): boolean {
  return !!getWorkerConfig().url;
}

function headers(token: string): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (token) h['authorization'] = `Bearer ${token}`;
  return h;
}

export async function checkWorkerHealth(): Promise<boolean> {
  const { url } = getWorkerConfig();
  if (!url) return false;
  try {
    const res = await fetch(`${url}/health`);
    if (!res.ok) return false;
    // Confirma que é o nosso worker (evita falso positivo ao bater no site).
    const data = await res.json().catch(() => null);
    return !!data && data.service === 'beehive-worker';
  } catch {
    return false;
  }
}

/** Despacha um job e aguarda a conclusão (poll). Nunca lança: erros voltam no resultado. */
export async function runWorkerJob(
  job: WorkerJob,
  opts: { timeoutMs?: number; onOutput?: (chunk: string) => void } = {},
): Promise<WorkerJobResult> {
  const { url, token } = getWorkerConfig();
  if (!url) return { status: 'error', output: '', error: 'Worker não configurado (defina a URL em Settings).' };

  const timeoutMs = opts.timeoutMs ?? 180000;
  try {
    const created = await fetch(`${url}/jobs`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(job),
    });
    if (!created.ok) {
      return { status: 'error', output: '', error: `Worker respondeu ${created.status}` };
    }
    const { id } = await created.json();

    const started = Date.now();
    let lastOutputLen = 0;
    // poll até done/error ou timeout
    while (Date.now() - started < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await fetch(`${url}/jobs/${id}`, { headers: headers(token) });
      if (!res.ok) continue;
      const rec = await res.json();
      if (opts.onOutput && typeof rec.output === 'string' && rec.output.length > lastOutputLen) {
        opts.onOutput(rec.output.slice(lastOutputLen));
        lastOutputLen = rec.output.length;
      }
      if (rec.status === 'done' || rec.status === 'error') {
        return {
          status: rec.status,
          output: rec.output ?? '',
          result: rec.result,
          error: rec.error,
          exitCode: rec.exitCode,
        };
      }
    }
    return { status: 'error', output: '', error: `Timeout após ${timeoutMs}ms` };
  } catch (err) {
    return { status: 'error', output: '', error: err instanceof Error ? err.message : String(err) };
  }
}
