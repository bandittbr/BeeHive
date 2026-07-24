// Adaptadores de OAuth por rede. Cada um sabe montar a URL de autorização e
// trocar o "code" por tokens + info da conta. Começa pelo TikTok; IG/FB/YT
// plugam depois seguindo a mesma interface.
import type { OauthApp } from './store.js';

export interface OauthResult {
  accountId: string;
  displayName?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

const TT_AUTH = 'https://www.tiktok.com/v2/auth/authorize/';
const TT_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';
const TT_USER = 'https://open.tiktokapis.com/v2/user/info/';

export function buildAuthUrl(platform: string, app: OauthApp, redirectUri: string, state: string): string {
  if (platform === 'tiktok') {
    const qs = new URLSearchParams({
      client_key: app.clientId,
      scope: app.scopes || 'user.info.basic,video.publish',
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    return `${TT_AUTH}?${qs.toString()}`;
  }
  throw new Error(`OAuth não suportado para: ${platform}`);
}

export async function exchangeCode(platform: string, app: OauthApp, redirectUri: string, code: string): Promise<OauthResult> {
  if (platform === 'tiktok') {
    const res = await fetch(TT_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: app.clientId,
        client_secret: app.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !j.access_token) {
      throw new Error(`troca de token falhou: ${j.error_description || j.error || res.status}`);
    }
    let displayName: string | undefined;
    try {
      const u = await fetch(`${TT_USER}?fields=open_id,display_name`, { headers: { authorization: `Bearer ${j.access_token}` } });
      const uj = (await u.json().catch(() => ({}))) as any;
      displayName = uj?.data?.user?.display_name;
    } catch { /* opcional */ }
    return { accountId: String(j.open_id), displayName, accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: j.expires_in };
  }
  throw new Error(`OAuth não suportado para: ${platform}`);
}
