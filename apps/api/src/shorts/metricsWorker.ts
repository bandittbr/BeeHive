import type { DatabaseManager } from '@beehive/platform/server';

/**
 * MetricsWorker — collects real metrics from social platforms periodically.
 * Runs as setInterval in the main process (no Redis/BullMQ).
 */

interface SocialAccount {
  id: string;
  agent_id: string;
  platform: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface ClipRecord {
  id: string;
  agent_id: string;
  external_post_id: string;
  platform: string;
}

export class MetricsWorker {
  private interval: NodeJS.Timeout | null = null;
  private readonly db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  start(intervalMs = 3_600_000): void {
    this.interval = setInterval(() => this.collectAll(), intervalMs);
    console.log('[MetricsWorker] Started, interval:', intervalMs, 'ms');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[MetricsWorker] Stopped');
    }
  }

  async collectAll(): Promise<void> {
    console.log('[MetricsWorker] Starting collection cycle...');
    try {
      await this.collectYouTubeMetrics();
      await this.collectTikTokMetrics();
      await this.collectInstagramMetrics();
    } catch (err) {
      console.error('[MetricsWorker] Error in collection cycle:', err);
    }
    console.log('[MetricsWorker] Collection cycle complete');
  }

  private getActiveAccounts(platform: string): SocialAccount[] {
    return this.db.queryAll<SocialAccount>(
      `SELECT id, agent_id, platform, access_token, refresh_token, token_expires_at
       FROM shorts_agent_social
       WHERE platform = ? AND active = 1 AND access_token != ''`,
      [platform],
    );
  }

  private getPublishedClips(agentId: string): ClipRecord[] {
    return this.db.queryAll<ClipRecord>(
      `SELECT id, agent_id, external_post_id, platform
       FROM shorts_pipeline_clips
       WHERE agent_id = ? AND status = 'published' AND external_post_id != ''`,
      [agentId],
    );
  }

  private insertMetrics(
    clipId: string,
    agentId: string,
    platform: string,
    views: number,
    likes: number,
    comments: number,
    shares: number,
    subscribersGained: number,
  ): void {
    const id = `sm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.db.execute(
      `INSERT INTO shorts_metrics (id, clip_id, agent_id, platform, views, likes, comments, shares, subscribers_gained, collected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clipId, agentId, platform, views, likes, comments, shares, subscribersGained, new Date().toISOString()],
    );
  }

  private async collectYouTubeMetrics(): Promise<void> {
    const accounts = this.getActiveAccounts('youtube');
    if (accounts.length === 0) {
      console.log('[MetricsWorker] No active YouTube accounts');
      return;
    }

    for (const account of accounts) {
      if (this.isTokenExpired(account.token_expires_at)) {
        console.warn(`[MetricsWorker] YouTube token expired for agent ${account.agent_id}, skipping`);
        continue;
      }

      const clips = this.getPublishedClips(account.agent_id);
      if (clips.length === 0) continue;

      for (const clip of clips) {
        try {
          const videoId = clip.external_post_id;
          const stats = await this.fetchYouTubeVideoStats(account.access_token, videoId);
          if (stats) {
            this.insertMetrics(
              clip.id,
              account.agent_id,
              'youtube',
              stats.views,
              stats.likes,
              stats.comments,
              stats.shares,
              0,
            );
          }
        } catch (err) {
          console.error(`[MetricsWorker] YouTube metrics error for clip ${clip.id}:`, err);
        }
      }
    }
  }

  private async fetchYouTubeVideoStats(
    accessToken: string,
    videoId: string,
  ): Promise<{ views: number; likes: number; comments: number; shares: number } | null> {
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${this.thirtyDaysAgo()}&endDate=${this.today()}&metrics=views,likes,comments,shares&filters=video==${videoId}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      if (resp.status === 401) {
        console.warn('[MetricsWorker] YouTube Analytics 401 — token may need refresh');
      }
      return null;
    }
    const data = await resp.json() as { rows?: number[][] };
    const row = data.rows?.[0];
    if (!row) return null;
    return { views: row[0] ?? 0, likes: row[1] ?? 0, comments: row[2] ?? 0, shares: row[3] ?? 0 };
  }

  private async collectTikTokMetrics(): Promise<void> {
    const accounts = this.getActiveAccounts('tiktok');
    if (accounts.length === 0) {
      console.log('[MetricsWorker] No active TikTok accounts');
      return;
    }

    for (const account of accounts) {
      if (this.isTokenExpired(account.token_expires_at)) {
        console.warn(`[MetricsWorker] TikTok token expired for agent ${account.agent_id}, skipping`);
        continue;
      }

      const clips = this.getPublishedClips(account.agent_id);
      if (clips.length === 0) continue;

      for (const clip of clips) {
        try {
          const stats = await this.fetchTikTokVideoStats(account.access_token, clip.external_post_id);
          if (stats) {
            this.insertMetrics(
              clip.id,
              account.agent_id,
              'tiktok',
              stats.views,
              stats.likes,
              stats.comments,
              stats.shares,
              0,
            );
          }
        } catch (err) {
          console.error(`[MetricsWorker] TikTok metrics error for clip ${clip.id}:`, err);
        }
      }
    }
  }

  private async fetchTikTokVideoStats(
    accessToken: string,
    videoId: string,
  ): Promise<{ views: number; likes: number; comments: number; shares: number } | null> {
    const url = `https://open.tiktokapis.com/v2/video/list/?fields=view_count,like_count,comment_count,share_count`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    });
    if (!resp.ok) {
      if (resp.status === 401) {
        console.warn('[MetricsWorker] TikTok API 401 — token may need refresh');
      }
      return null;
    }
    const data = await resp.json() as {
      data?: { videos?: Array<{ view_count: string; like_count: string; comment_count: string; share_count: string }> };
    };
    const video = data.data?.videos?.[0];
    if (!video) return null;
    return {
      views: parseInt(video.view_count ?? '0', 10) || 0,
      likes: parseInt(video.like_count ?? '0', 10) || 0,
      comments: parseInt(video.comment_count ?? '0', 10) || 0,
      shares: parseInt(video.share_count ?? '0', 10) || 0,
    };
  }

  private async collectInstagramMetrics(): Promise<void> {
    const accounts = this.getActiveAccounts('instagram');
    if (accounts.length === 0) {
      console.log('[MetricsWorker] No active Instagram accounts');
      return;
    }

    for (const account of accounts) {
      if (this.isTokenExpired(account.token_expires_at)) {
        console.warn(`[MetricsWorker] Instagram token expired for agent ${account.agent_id}, skipping`);
        continue;
      }

      const clips = this.getPublishedClips(account.agent_id);
      if (clips.length === 0) continue;

      for (const clip of clips) {
        try {
          const stats = await this.fetchInstagramPostStats(account.access_token, clip.external_post_id);
          if (stats) {
            this.insertMetrics(
              clip.id,
              account.agent_id,
              'instagram',
              stats.views,
              stats.likes,
              stats.comments,
              0,
              0,
            );
          }
        } catch (err) {
          console.error(`[MetricsWorker] Instagram metrics error for clip ${clip.id}:`, err);
        }
      }
    }
  }

  private async fetchInstagramPostStats(
    accessToken: string,
    mediaId: string,
  ): Promise<{ views: number; likes: number; comments: number } | null> {
    const fields = 'like_count,comments_count,insights.metric(impressions,reach)';
    const url = `https://graph.facebook.com/v18.0/${mediaId}?fields=${fields}&access_token=${accessToken}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 400) {
        console.warn('[MetricsWorker] Instagram API error — token may need refresh');
      }
      return null;
    }
    const data = await resp.json() as {
      like_count?: number;
      comments_count?: number;
      insights?: { data?: Array<{ name: string; values: Array<{ value: number }> }> };
    };
    const views = data.insights?.data?.find((d) => d.name === 'impressions')?.values?.[0]?.value ?? 0;
    return {
      views,
      likes: data.like_count ?? 0,
      comments: data.comments_count ?? 0,
    };
  }

  private isTokenExpired(expiresAt: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private thirtyDaysAgo(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }
}
