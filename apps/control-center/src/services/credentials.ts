// Cofre de credenciais das redes sociais (guardado localmente no navegador).
// O usuário cadastra as chaves de API; o worker usa para publicar.
// Começa pelo YouTube; Instagram/TikTok/Facebook entram depois com o mesmo padrão.

export type Privacy = 'public' | 'unlisted' | 'private';

export interface YoutubeCreds {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  channelTitle?: string;
  privacyStatus?: Privacy;
}

const LS_YT = 'beehive.creds.youtube';

const EMPTY_YT: YoutubeCreds = { clientId: '', clientSecret: '', refreshToken: '', privacyStatus: 'private' };

export function getYoutubeCreds(): YoutubeCreds {
  try {
    const raw = localStorage.getItem(LS_YT);
    if (!raw) return { ...EMPTY_YT };
    return { ...EMPTY_YT, ...(JSON.parse(raw) as Partial<YoutubeCreds>) };
  } catch {
    return { ...EMPTY_YT };
  }
}

export function setYoutubeCreds(c: YoutubeCreds): void {
  try {
    localStorage.setItem(LS_YT, JSON.stringify({
      clientId: c.clientId.trim(),
      clientSecret: c.clientSecret.trim(),
      refreshToken: c.refreshToken.trim(),
      channelTitle: c.channelTitle?.trim() || undefined,
      privacyStatus: c.privacyStatus || 'private',
    }));
  } catch {
    /* ignore */
  }
}

export function hasYoutubeCreds(): boolean {
  const c = getYoutubeCreds();
  return !!(c.clientId && c.clientSecret && c.refreshToken);
}
