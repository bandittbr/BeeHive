/**
 * Worker de Afiliados — processa jobs de discovery, geração de conteúdo
 * e publicação em background usando BullMQ + Redis.
 *
 * Inspirado no worker do AchadosPro.
 *
 * Para executar: npx tsx apps/api/src/affiliates/worker/index.ts
 * Requer: REDIS_URL no .env (Upstash Redis free tier funciona)
 */

import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { createAIRouter } from '../aiRouter.service';
import { MercadoLivreProvider } from '../providers/mercadoLivre.provider';
import { InstagramProvider } from '../providers/instagram.provider';
import type { DatabaseManager } from '@beehive/platform/server';

// ─── Conexão Redis ────────────────────────────────────────────────

function getRedisConnection(): IORedis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Worker] REDIS_URL não configurada. Worker desabilitado.');
    return null;
  }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// ─── Queues ────────────────────────────────────────────────────────

export function createQueues(connection: IORedis) {
  const conn = connection as any;
  return {
    discovery: new Queue('affiliates-discovery', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    content: new Queue('affiliates-content', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    publishing: new Queue('affiliates-publishing', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    metrics: new Queue('affiliates-metrics', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  };
}

// ─── Job Handlers ──────────────────────────────────────────────────

interface DiscoverProductsData {
  tenantId: string;
  rules: Array<{
    id: string;
    category: string;
    minPrice: number;
    maxPrice: number;
    minCommissionRate: number;
    minRating: number;
    affiliateProviders: string[];
    active: boolean;
  }>;
}

interface GenerateContentData {
  tenantId: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productOriginalPrice: number;
  commissionRate: number;
  affiliateLink: string;
}

interface PublishContentData {
  tenantId: string;
  contentId: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'imagem' | 'video';
  socialProvider: string;
}

interface SyncMetricsData {
  tenantId: string;
  publicationId: string;
  externalPostId: string;
  socialProvider: string;
}

export function createWorkers(
  connection: IORedis,
  db: DatabaseManager,
  queues: ReturnType<typeof createQueues>,
) {
  const aiRouter = createAIRouter(
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
  );
  const mercadoLivre = new MercadoLivreProvider();
  const instagram = new InstagramProvider();

  const conn = connection as any;

  // ─── Discovery Worker ───────────────────────────────────────────

  new Worker<DiscoverProductsData>(
    'affiliates-discovery',
    async (job: Job<DiscoverProductsData>) => {
      const { tenantId, rules } = job.data;
      console.log(`[Worker] Discovery para tenant ${tenantId}: ${rules.length} regras`);

      for (const rule of rules) {
        if (!rule.active) continue;

        console.log(`[Worker] Buscando produtos para: ${rule.category}`);
        const products = await mercadoLivre.search(rule.category, 10);

        for (const product of products) {
          // Verifica se o produto já existe
          const existing = db.queryOne(
            'SELECT id FROM affiliate_products WHERE external_id = ? AND tenant_id = ?',
            [product.externalId, tenantId],
          );

          if (existing) continue;

          // Calcula quality score
          const qualityScore = calculateQualityScore(
            product.commissionRate,
            product.rating,
            product.originalPrice > 0
              ? ((product.originalPrice - product.price) / product.originalPrice) * 100
              : 0,
          );

          // Verifica se atende as regras
          if (
            product.price < rule.minPrice ||
            product.price > rule.maxPrice ||
            product.commissionRate < rule.minCommissionRate ||
            product.rating < rule.minRating
          ) {
            continue;
          }

          const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          db.execute(
            `INSERT INTO affiliate_products (id, tenant_id, affiliate_provider, external_id, title, price, original_price, commission_rate, rating, image_url, affiliate_link, quality_score, status, discovered_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'descoberto', ?)`,
            [
              id, tenantId, 'mercado_livre', product.externalId,
              product.title, product.price, product.originalPrice,
              product.commissionRate, product.rating,
              product.imageUrl, product.affiliateLink,
              qualityScore, new Date().toISOString(),
            ],
          );

          console.log(`[Worker] Produto descoberto: ${product.title} (score: ${qualityScore})`);

          // Enfileira geração de conteúdo
          await queues.content.add('generate-content', {
            tenantId,
            productId: id,
            productTitle: product.title,
            productPrice: product.price,
            productOriginalPrice: product.originalPrice,
            commissionRate: product.commissionRate,
            affiliateLink: product.affiliateLink,
          });
        }
      }

      // Audit log
      db.execute(
        `INSERT INTO affiliate_audit_logs (id, tenant_id, event, payload, created_at)
         VALUES (?, ?, 'products.discovered', ?, ?)`,
        [
          `log-${Date.now()}`,
          tenantId,
          JSON.stringify({ rulesCount: rules.length }),
          new Date().toISOString(),
        ],
      );
    },
    { connection: conn },
  );

  // ─── Content Worker ─────────────────────────────────────────────

  new Worker<GenerateContentData>(
    'affiliates-content',
    async (job: Job<GenerateContentData>) => {
      const { tenantId, productId, productTitle, productPrice, productOriginalPrice, commissionRate, affiliateLink } = job.data;

      console.log(`[Worker] Gerando conteúdo para: ${productTitle}`);

      const prompt = buildContentPrompt({
        title: productTitle,
        price: productPrice,
        originalPrice: productOriginalPrice,
        commissionRate,
        affiliateLink,
      });

      const { text, provider } = await aiRouter.generateText(prompt);

      // Parse da resposta JSON
      let caption = '';
      let hashtags: string[] = [];
      let mediaType: 'imagem' | 'video' = 'imagem';

      try {
        const parsed = JSON.parse(text);
        caption = parsed.caption ?? text;
        hashtags = parsed.hashtags ?? [];
        mediaType = parsed.mediaType ?? 'imagem';
      } catch {
        // Se não for JSON válido, usa o texto como caption
        caption = text;
      }

      const contentId = `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.execute(
        `INSERT INTO affiliate_content (id, tenant_id, product_id, caption, hashtags, media_type, media_urls, ai_provider_used, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'gerado', ?)`,
        [
          contentId, tenantId, productId,
          caption, JSON.stringify(hashtags), mediaType,
          JSON.stringify([]), provider,
          new Date().toISOString(),
        ],
      );

      console.log(`[Worker] Conteúdo gerado para: ${productTitle} (via ${provider})`);

      // Enfileira publicação
      await queues.publishing.add('publish-content', {
        tenantId,
        contentId,
        caption,
        mediaUrl: '', // Será preenchido quando tivermos geração de imagem
        mediaType,
        socialProvider: 'instagram',
      });

      // Audit log
      db.execute(
        `INSERT INTO affiliate_audit_logs (id, tenant_id, event, payload, created_at)
         VALUES (?, ?, 'content.generated', ?, ?)`,
        [
          `log-${Date.now()}`,
          tenantId,
          JSON.stringify({ productId, provider, mediaType }),
          new Date().toISOString(),
        ],
      );
    },
    { connection: conn },
  );

  // ─── Publishing Worker ──────────────────────────────────────────

  new Worker<PublishContentData>(
    'affiliates-publishing',
    async (job: Job<PublishContentData>) => {
      const { tenantId, contentId, caption, mediaUrl, mediaType, socialProvider } = job.data;

      console.log(`[Worker] Publicando conteúdo ${contentId} no ${socialProvider}`);

      // Verifica kill switch
      const settings = db.queryOne<{ kill_switch_active: number }>(
        'SELECT kill_switch_active FROM automation_settings WHERE tenant_id = ?',
        [tenantId],
      );

      if (settings?.kill_switch_active) {
        console.log('[Worker] Automação pausada. Pulando publicação.');
        return;
      }

      try {
        const result = await instagram.publish(caption, mediaUrl, mediaType);

        const pubId = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        db.execute(
          `INSERT INTO affiliate_publications (id, tenant_id, content_id, social_provider, external_post_id, published_at, status)
           VALUES (?, ?, ?, ?, ?, ?, 'publicado')`,
          [pubId, tenantId, contentId, socialProvider, result.externalPostId, new Date().toISOString()],
        );

        // Atualiza status do conteúdo
        db.execute(
          'UPDATE affiliate_content SET status = ?, published_at = ? WHERE id = ?',
          ['publicado', new Date().toISOString(), contentId],
        );

        console.log(`[Worker] Publicado: ${result.externalPostId}${result.demo ? ' (demo)' : ''}`);

        // Audit log
        db.execute(
          `INSERT INTO affiliate_audit_logs (id, tenant_id, event, payload, created_at)
           VALUES (?, ?, 'content.published', ?, ?)`,
          [
            `log-${Date.now()}`,
            tenantId,
            JSON.stringify({ contentId, socialProvider, demo: result.demo }),
            new Date().toISOString(),
          ],
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        db.execute(
          `INSERT INTO affiliate_publications (id, tenant_id, content_id, social_provider, status, error_message)
           VALUES (?, ?, ?, ?, 'falhou', ?)`,
          [pubIdFallback(), tenantId, contentId, socialProvider, errorMessage],
        );

        db.execute(
          'UPDATE affiliate_content SET status = ? WHERE id = ?',
          ['falhou', contentId],
        );

        console.error(`[Worker] Falha na publicação: ${errorMessage}`);
      }
    },
    { connection: conn },
  );

  // ─── Metrics Worker ─────────────────────────────────────────────

  new Worker<SyncMetricsData>(
    'affiliates-metrics',
    async (job: Job<SyncMetricsData>) => {
      const { tenantId, publicationId, externalPostId } = job.data;

      console.log(`[Worker] Sincronizando métricas para ${publicationId}`);

      try {
        const insights = await instagram.getInsights(externalPostId);

        const metricId = `met-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        db.execute(
          `INSERT INTO affiliate_metrics (id, tenant_id, publication_id, likes, comments, reach, clicks, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          [metricId, tenantId, publicationId, insights.likes, insights.comments, insights.reach, new Date().toISOString()],
        );

        console.log(`[Worker] Métricas sincronizadas: ${insights.likes} likes, ${insights.comments} comments, ${insights.reach} reach`);

        // Audit log
        db.execute(
          `INSERT INTO affiliate_audit_logs (id, tenant_id, event, payload, created_at)
           VALUES (?, ?, 'metrics.synced', ?, ?)`,
          [
            `log-${Date.now()}`,
            tenantId,
            JSON.stringify({ publicationId, likes: insights.likes, comments: insights.comments, reach: insights.reach }),
            new Date().toISOString(),
          ],
        );
      } catch (err) {
        console.error('[Worker] Erro ao sincronizar métricas:', err);
      }
    },
    { connection: conn },
  );

  console.log('[Worker] Todos os workers registrados.');
}

// ─── Helpers ───────────────────────────────────────────────────────

function pubIdFallback(): string {
  return `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function calculateQualityScore(
  commissionRate: number,
  rating: number,
  discountPercent: number,
): number {
  // 40% comissão + 40% rating + 20% desconto
  return Math.round(
    (commissionRate / 20) * 40 + // Normaliza: 20% = 40pts
    (rating / 5) * 40 +          // Normaliza: 5 = 40pts
    (discountPercent / 100) * 20, // Normaliza: 100% = 20pts
  );
}

function buildContentPrompt(params: {
  title: string;
  price: number;
  originalPrice: number;
  commissionRate: number;
  affiliateLink: string;
}): string {
  const discount = params.originalPrice > 0
    ? Math.round(((params.originalPrice - params.price) / params.originalPrice) * 100)
    : 0;

  return `Você é um copywriter especialista em marketing de afiliados. Gere conteúdo para Instagram sobre o produto abaixo.

Produto: ${params.title}
Preço: R$ ${params.price.toFixed(2)}
Preço Original: R$ ${params.originalPrice.toFixed(2)}
Desconto: ${discount}%
Comissão: ${params.commissionRate}%
Link: ${params.affiliateLink}

Responda APENAS com um JSON válido no formato:
{
  "caption": "texto da legenda em português brasileiro, com emojis, chamada para ação e o link de afiliado",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "mediaType": "imagem"
}

A legenda deve ser persuasiva, destacando o desconto e a oportunidade. Use linguagem casual e amigável. Máximo 200 caracteres.`;
}

// ─── Bootstrap ─────────────────────────────────────────────────────

export function bootstrapWorker(db: DatabaseManager): void {
  const connection = getRedisConnection();
  if (!connection) {
    console.log('[Worker] Redis não disponível. Worker não iniciado.');
    return;
  }

  const queues = createQueues(connection);
  createWorkers(connection, db, queues);

  console.log('[Worker] Sistema de workers inicializado.');
  console.log(`  - Discovery queue: ${queues.discovery.name}`);
  console.log(`  - Content queue: ${queues.content.name}`);
  console.log(`  - Publishing queue: ${queues.publishing.name}`);
  console.log(`  - Metrics queue: ${queues.metrics.name}`);
}
