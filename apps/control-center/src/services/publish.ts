// Serviço de publicação: despacha o job de postagem para o worker.
// Hoje: YouTube (Shorts). Mesma assinatura servirá para as outras redes.
import { runWorkerJob, isWorkerConfigured } from './worker';
import { getYoutubeCreds, hasYoutubeCreds, type Privacy } from './credentials';

export interface PublishResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function publishToYoutube(opts: {
  file: string; // nome do arquivo no workspace do worker (ex: clip_1.mp4)
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: Privacy;
  onProgress?: (msg: string) => void;
}): Promise<PublishResult> {
  if (!isWorkerConfigured()) return { ok: false, error: 'Configure o Cowork Nuvem (worker) em Settings.' };
  if (!hasYoutubeCreds()) return { ok: false, error: 'Cadastre as credenciais do YouTube em Settings → Conexões.' };

  const creds = getYoutubeCreds();
  const res = await runWorkerJob(
    {
      type: 'publishYoutube',
      payload: {
        file: opts.file,
        title: opts.title.slice(0, 100),
        description: opts.description ?? '',
        tags: opts.tags ?? [],
        privacyStatus: opts.privacyStatus ?? creds.privacyStatus ?? 'private',
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: creds.refreshToken,
      },
    },
    { timeoutMs: 600000, onOutput: opts.onProgress ? (c) => opts.onProgress!(c) : undefined },
  );

  if (res.status !== 'done') return { ok: false, error: res.error || res.output || 'Falha ao publicar.' };
  const r = res.result as { url?: string } | undefined;
  return { ok: true, url: r?.url };
}
