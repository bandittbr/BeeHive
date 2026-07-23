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

// ---------- Instagram (Reels via Graph API) ----------
export interface InstagramCreds { igUserId: string; accessToken: string; }
const LS_IG = 'beehive.creds.instagram';
const EMPTY_IG: InstagramCreds = { igUserId: '', accessToken: '' };

export function getInstagramCreds(): InstagramCreds {
  try {
    const raw = localStorage.getItem(LS_IG);
    return raw ? { ...EMPTY_IG, ...(JSON.parse(raw) as Partial<InstagramCreds>) } : { ...EMPTY_IG };
  } catch { return { ...EMPTY_IG }; }
}
export function setInstagramCreds(c: InstagramCreds): void {
  try { localStorage.setItem(LS_IG, JSON.stringify({ igUserId: c.igUserId.trim(), accessToken: c.accessToken.trim() })); } catch { /* ignore */ }
}
export function hasInstagramCreds(): boolean {
  const c = getInstagramCreds();
  return !!(c.igUserId && c.accessToken);
}

// ---------- Facebook (vídeo na Página via Graph API) ----------
export interface FacebookCreds { pageId: string; accessToken: string; }
const LS_FB = 'beehive.creds.facebook';
const EMPTY_FB: FacebookCreds = { pageId: '', accessToken: '' };

export function getFacebookCreds(): FacebookCreds {
  try {
    const raw = localStorage.getItem(LS_FB);
    return raw ? { ...EMPTY_FB, ...(JSON.parse(raw) as Partial<FacebookCreds>) } : { ...EMPTY_FB };
  } catch { return { ...EMPTY_FB }; }
}
export function setFacebookCreds(c: FacebookCreds): void {
  try { localStorage.setItem(LS_FB, JSON.stringify({ pageId: c.pageId.trim(), accessToken: c.accessToken.trim() })); } catch { /* ignore */ }
}
export function hasFacebookCreds(): boolean {
  const c = getFacebookCreds();
  return !!(c.pageId && c.accessToken);
}

// ---------- TikTok (Content Posting API) ----------
export interface TiktokCreds { clientKey: string; clientSecret: string; refreshToken: string; privacyLevel?: string; }
const LS_TT = 'beehive.creds.tiktok';
const EMPTY_TT: TiktokCreds = { clientKey: '', clientSecret: '', refreshToken: '', privacyLevel: 'SELF_ONLY' };

export function getTiktokCreds(): TiktokCreds {
  try {
    const raw = localStorage.getItem(LS_TT);
    return raw ? { ...EMPTY_TT, ...(JSON.parse(raw) as Partial<TiktokCreds>) } : { ...EMPTY_TT };
  } catch { return { ...EMPTY_TT }; }
}
export function setTiktokCreds(c: TiktokCreds): void {
  try { localStorage.setItem(LS_TT, JSON.stringify({ clientKey: c.clientKey.trim(), clientSecret: c.clientSecret.trim(), refreshToken: c.refreshToken.trim(), privacyLevel: c.privacyLevel || 'SELF_ONLY' })); } catch { /* ignore */ }
}
export function hasTiktokCreds(): boolean {
  const c = getTiktokCreds();
  return !!(c.clientKey && c.clientSecret && c.refreshToken);
}
