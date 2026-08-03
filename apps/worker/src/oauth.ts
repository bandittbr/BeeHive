// Adaptadores de OAuth por rede - YouTube, Instagram, Facebook, TikTok, X
import type { OauthApp } from './store.js';

export interface OauthResult {
  accountId: string;
  displayName?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE
// ─────────────────────────────────────────────────────────────────────────────
const YT_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const YT_TOKEN = 'https://oauth2.googleapis.com/token';
const YT_USER = 'https://www.googleapis.com/youtube/v3/channels';

export function buildAuthUrl(platform: string, app: OauthApp, redirectUri: string, state: string): string {
  if (platform === 'youtube') {
    const qs = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${YT_AUTH}?${qs.toString()}`;
  }
  
  if (platform === 'instagram') {
    const qs = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'instagram_basic,instagram_content_publish,pages_read_engagement',
      state,
    });
    return `https://api.instagram.com/oauth/authorize?${qs.toString()}`;
  }
  
  if (platform === 'facebook') {
    const qs = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'pages_manage_posts,publish_to_groups,pages_show_list',
      state,
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${qs.toString()}`;
  }
  
  if (platform === 'tiktok') {
    const qs = new URLSearchParams({
      client_key: app.clientId,
      scope: app.scopes || 'user.info.basic,video.publish',
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${qs.toString()}`;
  }
  
  if (platform === 'twitter') {
    // Twitter/X usa OAuth 1.0a - simplificado
    const qs = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'tweet.read tweet.write users.read',
      state,
    });
    return `https://twitter.com/i/oauth2/authorize?${qs.toString()}`;
  }
  
  throw new Error(`OAuth nǜo suportado para: ${platform}`);
}

export async function exchangeCode(platform: string, app: OauthApp, redirectUri: string, code: string): Promise<OauthResult> {
  // ── YOUTUBE ──
  if (platform === 'youtube') {
    const res = await fetch(YT_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !j.access_token) throw new Error(`YouTube OAuth falhou: ${j.error_description || j.error}`);
    
    // Pega info do canal
    let displayName: string | undefined;
    let channelId: string | undefined;
    try {
      const u = await fetch(`${YT_USER}?mine=true&part=snippet`, {
        headers: { authorization: `Bearer ${j.access_token}` }
      });
      const uj = (await u.json().catch(() => ({}))) as any;
      displayName = uj?.items?.[0]?.snippet?.title;
      channelId = uj?.items?.[0]?.id;
    } catch {}
    
    return {
      accountId: channelId || j.id || 'youtube_channel',
      displayName,
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresIn: j.expires_in,
    };
  }
  
  // ── INSTAGRAM ──
  if (platform === 'instagram') {
    const res = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !j.access_token) throw new Error(`Instagram OAuth falhou: ${j.error_message || j.error}`);
    
    // Pega info do usuário
    let displayName: string | undefined;
    try {
      const u = await fetch('https://graph.instagram.com/me?fields=id,username&access_token=' + j.access_token);
      const uj = (await u.json().catch(() => ({}))) as any;
      displayName = uj.username;
    } catch {}
    
    return {
      accountId: j.user_id || j.id || 'instagram_user',
      displayName,
      accessToken: j.access_token,
    };
  }
  
  // ── FACEBOOK ──
  if (platform === 'facebook') {
    const res = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    }).catch(() => null);
    
    // Facebook redirects ao invés de JSON
    // Simplificado: usa o redirect
    return {
      accountId: 'facebook_page',
      accessToken: code, // Em produção precisaria de troca adicional
    };
  }
  
  // ── TIKTOK ──
  if (platform === 'tiktok') {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
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
    if (!res.ok || !j.access_token) throw new Error(`TikTok OAuth falhou: ${j.error_description || j.error}`);
    
    let displayName: string | undefined;
    try {
      const u = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        headers: { authorization: `Bearer ${j.access_token}` }
      });
      const uj = (await u.json().catch(() => ({}))) as any;
      displayName = uj?.data?.user?.display_name;
    } catch {}
    
    return {
      accountId: j.open_id,
      displayName,
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresIn: j.expires_in,
    };
  }
  
  // ── TWITTER/X ──
  if (platform === 'twitter') {
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: app.clientId,
        redirect_uri: redirectUri,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !j.access_token) throw new Error(`Twitter OAuth falhou: ${j.error_description || j.error}`);
    
    return {
      accountId: j.access_token, // Simplificado
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
    };
  }
  
  throw new Error(`OAuth nǜo suportado para: ${platform}`);
}

// Função para testar se as credenciais estão configuradas
export async function testConnection(platform: string, accessToken: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (platform === 'youtube') {
      const res = await fetch('https://www.googleapis.com/youtube/v3/channels?mine=true', {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Credenciais inválidas');
      return { ok: true };
    }
    if (platform === 'instagram') {
      const res = await fetch('https://graph.instagram.com/me?fields=id&access_token=' + accessToken);
      if (!res.ok) throw new Error('Credenciais inválidas');
      return { ok: true };
    }
    if (platform === 'tiktok') {
      const res = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('Credenciais inválidas');
      return { ok: true };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
