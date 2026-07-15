import type { Express } from 'express';
import type { DatabaseManager } from '@beehive/platform/server';
import { randomUUID } from 'node:crypto';

/**
 * OAuth routes for YouTube (Google), TikTok, and Instagram.
 * Handles authorization, callback, and token refresh.
 */

const REDIRECT_BASE = process.env.OAUTH_REDIRECT_URL || 'https://beehive-production-d934.up.railway.app';
const FRONTEND_BASE = process.env.FRONTEND_URL || 'https://bee-hive-web-six.vercel.app';

function now(): string {
  return new Date().toISOString();
}

function buildYouTubeAuthUrl(agentId: string): string {
  const clientId = process.env.YOUTUBE_CLIENT_ID ?? '';
  const scopes = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/yt-analytics.readonly';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${REDIRECT_BASE}/api/oauth/youtube/callback`,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: agentId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function buildTikTokAuthUrl(agentId: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY ?? '';
  const scopes = 'video.upload video.publish';
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: `${REDIRECT_BASE}/api/oauth/tiktok/callback`,
    response_type: 'code',
    scope: scopes,
    state: agentId,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

function buildInstagramAuthUrl(agentId: string): string | null {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  if (!clientId) return null;
  const scopes = 'instagram_basic instagram_content_publish pages_manage_engagement';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${REDIRECT_BASE}/api/oauth/instagram/callback`,
    response_type: 'code',
    scope: scopes,
    state: agentId,
  });
  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

async function exchangeYouTubeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
      client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
      redirect_uri: `${REDIRECT_BASE}/api/oauth/youtube/callback`,
      grant_type: 'authorization_code',
    }).toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`YouTube token exchange failed (${resp.status}): ${text}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: (data.expires_in as number) ?? 3600,
  };
}

async function exchangeTikTokCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${REDIRECT_BASE}/api/oauth/tiktok/callback`,
    }).toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`TikTok token exchange failed (${resp.status}): ${text}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const accessToken = (data.access_token as string) ?? '';
  const refreshToken = (data.refresh_token as string) ?? '';
  const expiresIn = (data.expires_in as number) ?? 7200;
  if (!accessToken) {
    throw new Error('TikTok returned empty access_token');
  }
  return { accessToken, refreshToken, expiresIn };
}

async function exchangeInstagramCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const resp = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID ?? '',
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET ?? '',
      redirect_uri: `${REDIRECT_BASE}/api/oauth/instagram/callback`,
      code,
    }).toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Instagram token exchange failed (${resp.status}): ${text}`);
  }
  const data = await resp.json() as Record<string, unknown>;
  const shortToken = data.access_token as string;
  const expiresIn = (data.expires_in as number) ?? 3600;

  // Exchange short-lived token for long-lived token
  const longResp = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID ?? ''}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET ?? ''}&fb_exchange_token=${shortToken}`,
  );
  if (longResp.ok) {
    const longData = await longResp.json() as Record<string, unknown>;
    return {
      accessToken: (longData.access_token as string) ?? shortToken,
      refreshToken: '',
      expiresIn: (longData.expires_in as number) ?? expiresIn,
    };
  }
  return { accessToken: shortToken, refreshToken: '', expiresIn };
}

function upsertSocialAccount(
  db: DatabaseManager,
  agentId: string,
  platform: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): string {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const existing = db.queryOne<{ id: string }>(
    'SELECT id FROM shorts_agent_social WHERE agent_id = ? AND platform = ?',
    [agentId, platform],
  );

  if (existing) {
    db.execute(
      `UPDATE shorts_agent_social SET access_token = ?, refresh_token = ?, token_expires_at = ?, connected_at = ?, active = 1 WHERE id = ?`,
      [accessToken, refreshToken, expiresAt, now(), existing.id],
    );
    return existing.id;
  }

  const id = `oauth-${randomUUID()}`;
  db.execute(
    `INSERT INTO shorts_agent_social (id, agent_id, platform, account_name, access_token, refresh_token, token_expires_at, connected_at, active)
     VALUES (?, ?, ?, '', ?, ?, ?, ?, 1)`,
    [id, agentId, platform, accessToken, refreshToken, expiresAt, now()],
  );
  return id;
}

async function refreshTokenForPlatform(
  platform: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  if (platform === 'youtube') {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (!resp.ok) throw new Error(`YouTube refresh failed: ${resp.status}`);
    const data = await resp.json() as Record<string, unknown>;
    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string) ?? refreshToken,
      expiresIn: (data.expires_in as number) ?? 3600,
    };
  }

  if (platform === 'tiktok') {
    const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!resp.ok) throw new Error(`TikTok refresh failed: ${resp.status}`);
    const data = await resp.json() as Record<string, unknown>;
    return {
      accessToken: (data.access_token as string) ?? '',
      refreshToken: (data.refresh_token as string) ?? refreshToken,
      expiresIn: (data.expires_in as number) ?? 7200,
    };
  }

  if (platform === 'instagram') {
    const resp = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.INSTAGRAM_CLIENT_ID ?? '',
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET ?? '',
        fb_exchange_token: refreshToken,
      }).toString(),
    });
    if (!resp.ok) throw new Error(`Instagram refresh failed: ${resp.status}`);
    const data = await resp.json() as Record<string, unknown>;
    return {
      accessToken: (data.access_token as string) ?? '',
      refreshToken: '',
      expiresIn: (data.expires_in as number) ?? 3600,
    };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

export function mountOAuthRoutes(app: Express, db: DatabaseManager): void {

  // ─── YouTube ────────────────────────────────────────────

  app.get('/api/oauth/youtube/authorize', (req, res) => {
    try {
      const agentId = req.query.agentId as string;
      if (!agentId) {
        res.status(400).json({ error: 'agentId query param required' });
        return;
      }
      const url = buildYouTubeAuthUrl(agentId);
      res.json({ url });
    } catch (err) {
      console.error('[oauth] YouTube authorize error:', err);
      res.status(500).json({ error: 'Failed to build YouTube auth URL' });
    }
  });

  app.get('/api/oauth/youtube/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      const agentId = req.query.state as string;
      if (!code || !agentId) {
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const tokens = await exchangeYouTubeCode(code);
      const socialId = upsertSocialAccount(db, agentId, 'youtube', tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      console.log(`[oauth] YouTube connected for agent ${agentId}, social ${socialId}`);

      res.redirect(`${FRONTEND_BASE}/agents/${agentId}?youtube=connected`);
    } catch (err) {
      console.error('[oauth] YouTube callback error:', err);
      const msg = encodeURIComponent(err instanceof Error ? err.message : 'Unknown error');
      res.redirect(`${FRONTEND_BASE}/agents?oauth_error=${msg}`);
    }
  });

  // ─── TikTok ─────────────────────────────────────────────

  app.get('/api/oauth/tiktok/authorize', (req, res) => {
    try {
      const agentId = req.query.agentId as string;
      if (!agentId) {
        res.status(400).json({ error: 'agentId query param required' });
        return;
      }
      const url = buildTikTokAuthUrl(agentId);
      res.json({ url });
    } catch (err) {
      console.error('[oauth] TikTok authorize error:', err);
      res.status(500).json({ error: 'Failed to build TikTok auth URL' });
    }
  });

  app.get('/api/oauth/tiktok/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      const agentId = req.query.state as string;
      if (!code || !agentId) {
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const tokens = await exchangeTikTokCode(code);
      const socialId = upsertSocialAccount(db, agentId, 'tiktok', tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      console.log(`[oauth] TikTok connected for agent ${agentId}, social ${socialId}`);

      res.redirect(`${FRONTEND_BASE}/agents/${agentId}?tiktok=connected`);
    } catch (err) {
      console.error('[oauth] TikTok callback error:', err);
      const msg = encodeURIComponent(err instanceof Error ? err.message : 'Unknown error');
      res.redirect(`${FRONTEND_BASE}/agents?oauth_error=${msg}`);
    }
  });

  // ─── Instagram ──────────────────────────────────────────

  app.get('/api/oauth/instagram/authorize', (req, res) => {
    try {
      const agentId = req.query.agentId as string;
      if (!agentId) {
        res.status(400).json({ error: 'agentId query param required' });
        return;
      }
      const url = buildInstagramAuthUrl(agentId);
      if (!url) {
        res.status(500).json({ error: 'INSTAGRAM_CLIENT_ID nao configurado no servidor' });
        return;
      }
      res.redirect(url);
    } catch (err) {
      console.error('[oauth] Instagram authorize error:', err);
      res.status(500).json({ error: 'Failed to build Instagram auth URL' });
    }
  });

  app.get('/api/oauth/instagram/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      const agentId = req.query.state as string;
      if (!code || !agentId) {
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const tokens = await exchangeInstagramCode(code);
      const socialId = upsertSocialAccount(db, agentId, 'instagram', tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      console.log(`[oauth] Instagram connected for agent ${agentId}, social ${socialId}`);

      res.redirect(`${FRONTEND_BASE}/agents/${agentId}?instagram=connected`);
    } catch (err) {
      console.error('[oauth] Instagram callback error:', err);
      const msg = encodeURIComponent(err instanceof Error ? err.message : 'Unknown error');
      res.redirect(`${FRONTEND_BASE}/agents?oauth_error=${msg}`);
    }
  });

  // ─── Generic Token Refresh ───────────────────────────────

  app.post('/api/oauth/refresh', async (req, res) => {
    try {
      const { socialId } = req.body;
      if (!socialId) {
        res.status(400).json({ error: 'socialId is required' });
        return;
      }

      const account = db.queryOne<Record<string, unknown>>(
        'SELECT * FROM shorts_agent_social WHERE id = ?',
        [socialId],
      );
      if (!account) {
        res.status(404).json({ error: 'Social account not found' });
        return;
      }

      const platform = account.platform as string;
      const refreshToken = account.refresh_token as string;
      if (!refreshToken) {
        res.status(400).json({ error: `No refresh token available for ${platform}` });
        return;
      }

      const tokens = await refreshTokenForPlatform(platform, refreshToken);
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

      db.execute(
        `UPDATE shorts_agent_social SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?`,
        [tokens.accessToken, tokens.refreshToken || refreshToken, expiresAt, socialId],
      );

      console.log(`[oauth] Refreshed ${platform} token for social ${socialId}`);
      res.json({ success: true, expiresIn: tokens.expiresIn });
    } catch (err) {
      console.error('[oauth] Refresh error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Token refresh failed' });
    }
  });
}
