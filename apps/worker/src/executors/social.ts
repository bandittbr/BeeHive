/**
 * Social Scraper — executor de raspagem de redes sociais.
 *
 * Atualmente: Instagram.
 * Futuro: TikTok, Facebook, etc.
 */
import { crawlInstagram, type CrawlRequest, type CrawlResult } from './instagramCrawler.js';

export type { CrawlResult, CrawlRequest, InstagramPost, InstagramMedia, InstagramProfile } from './instagramCrawler.js';

/**
 * Raspa um perfil do Instagram: baixa mídias, salva legendas em .md.
 */
export async function scrapeInstagram(req: CrawlRequest): Promise<CrawlResult> {
  return crawlInstagram(req);
}
