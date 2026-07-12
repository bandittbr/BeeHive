/**
 * Instagram Provider — publicação de conteúdo no Instagram via Meta Graph API.
 *
 * Modo demo quando não configurado.
 */

import type { PublishResult } from '@beehive/platform';

export interface InstagramConfig {
  accessToken?: string;
  instagramAccountId?: string;
}

export class InstagramProvider {
  private config: InstagramConfig;
  private demoMode: boolean;

  constructor(config: InstagramConfig = {}) {
    this.config = config;
    this.demoMode = !(config.accessToken && config.instagramAccountId);
  }

  isConfigured(): boolean {
    return !this.demoMode;
  }

  /**
   * Publica conteúdo no Instagram.
   * Em modo demo, apenas simula a publicação.
   */
  async publish(
    caption: string,
    mediaUrl: string,
    mediaType: 'imagem' | 'video' = 'imagem',
  ): Promise<PublishResult> {
    if (this.demoMode) {
      console.log('[Instagram] Modo demo: simulando publicação');
      console.log(`  Caption: ${caption.slice(0, 100)}...`);
      console.log(`  Media: ${mediaUrl}`);
      return {
        externalPostId: `demo-${Date.now()}`,
        demo: true,
      };
    }

    try {
      // Passo 1: Criar container de mídia
      const mediaEndpoint =
        mediaType === 'video'
          ? 'https://graph.facebook.com/v21.0/${instagramAccountId}/media_video'
          : 'https://graph.facebook.com/v21.0/${instagramAccountId}/media';

      const createRes = await fetch(mediaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption,
          access_token: this.config.accessToken,
        }),
      });

      if (!createRes.ok) {
        const error = await createRes.text();
        throw new Error(`Instagram create media error: ${error}`);
      }

      const createData = (await createRes.json()) as { id: string };

      // Passo 2: Publicar o container
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${this.config.instagramAccountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: createData.id,
            access_token: this.config.accessToken,
          }),
        },
      );

      if (!publishRes.ok) {
        const error = await publishRes.text();
        throw new Error(`Instagram publish error: ${error}`);
      }

      const publishData = (await publishRes.json()) as { id: string };

      return {
        externalPostId: publishData.id,
        demo: false,
      };
    } catch (err) {
      console.error('[Instagram] Erro na publicação:', err);
      throw err;
    }
  }

  /**
   * Busca métricas de uma publicação.
   */
  async getInsights(mediaId: string): Promise<{
    likes: number;
    comments: number;
    reach: number;
  }> {
    if (this.demoMode) {
      return {
        likes: Math.floor(Math.random() * 100) + 10,
        comments: Math.floor(Math.random() * 20) + 1,
        reach: Math.floor(Math.random() * 1000) + 100,
      };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=likes,comments,reach&access_token=${this.config.accessToken}`,
      );

      if (!res.ok) {
        throw new Error(`Instagram insights error: ${res.status}`);
      }

      const data = (await res.json()) as {
        data?: Array<{
          name: string;
          values?: Array<{ value: number }>;
        }>;
      };

      const metrics = {
        likes: 0,
        comments: 0,
        reach: 0,
      };

      for (const metric of data.data ?? []) {
        const value = metric.values?.[0]?.value ?? 0;
        if (metric.name === 'likes') metrics.likes = value;
        if (metric.name === 'comments') metrics.comments = value;
        if (metric.name === 'reach') metrics.reach = value;
      }

      return metrics;
    } catch (err) {
      console.error('[Instagram] Erro ao buscar métricas:', err);
      return { likes: 0, comments: 0, reach: 0 };
    }
  }
}
