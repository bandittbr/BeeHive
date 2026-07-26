/**
 * Google Maps Scraper (Node.js + Playwright)
 * ===========================================
 * Searches Google Maps and extracts place data.
 * Uses Playwright (already installed for whatsapp-web.js) instead of Puppeteer,
 * to avoid Chromium compatibility issues on Railway.
 */

import { chromium, Browser, Page } from 'playwright';

export interface ScrapeRequest {
  search: string;
  total?: number;
  headless?: boolean;
}

export interface ScrapedPlace {
  name: string;
  address: string;
  website: string;
  phone_number: string;
  reviews_count: number | null;
  reviews_average: number | null;
  place_type: string;
  opens_at: string;
  introduction: string;
  category: string;
}

interface ScrapeStats {
  found: number;
  extracted: number;
  errors: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeText(page: Page, selector: string): Promise<string> {
  try {
    const el = page.locator(selector).first();
    return (await el.textContent())?.trim() ?? '';
  } catch {
    return '';
  }
}

// ─── Main Scraper ───────────────────────────────────────────────────────────────

export async function scrapeGoogleMaps(
  req: ScrapeRequest,
): Promise<{ places: ScrapedPlace[]; stats: ScrapeStats }> {
  const { search, total = 20 } = req;
  const headless = req.headless !== false;

  const places: ScrapedPlace[] = [];
  const stats: ScrapeStats = { found: 0, extracted: 0, errors: 0 };

  let browser: Browser | null = null;

  const TIMEOUT_MS = 3 * 60 * 1000;
  const deadline = Date.now() + TIMEOUT_MS;

  try {
    browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: 'pt-BR',
    });

    const page = await context.newPage();

    // Navigate to Google Maps
    await page.goto('https://www.google.com/maps/@-14.23,-51.92,4z', {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    // Wait for Maps UI to settle
    await sleep(5000);

    if (Date.now() > deadline) throw new Error('Timeout: page load');

    // Accept cookies if present
    try {
      const cookieBtn = page.locator('[jsname="b3VHJd"], button:has-text("Aceitar"), button:has-text("Accept all")').first();
      if (await cookieBtn.isVisible({ timeout: 3000 })) {
        await cookieBtn.click();
        await sleep(1500);
      }
    } catch {
      // no cookie popup
    }

    if (Date.now() > deadline) throw new Error('Timeout: cookies');

    // Type search and press Enter
    const searchInput = page.locator('input[name="q"]');
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    } catch {
      // Try clicking search button first
      try {
        const searchBtn = page.locator('button[aria-label="Search"]').first();
        if (await searchBtn.isVisible({ timeout: 3000 })) {
          await searchBtn.click();
          await sleep(2000);
        }
      } catch { /* last attempt */ }
      await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    }

    if (Date.now() > deadline) throw new Error('Timeout: search input');

    await searchInput.fill(search);
    await page.keyboard.press('Enter');

    // Wait for results
    await sleep(3000);
    try {
      await page.locator('a[href*="maps/place"]').first().waitFor({ state: 'visible', timeout: 30000 });
    } catch {
      await page.locator('[role="feed"]').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    }
    await sleep(2000);

    if (Date.now() > deadline) throw new Error('Timeout: results');

    // ── Scroll results panel to load more ────────────────────────────────────
    const panel = page.locator('div[role="feed"]');
    const panelEl = await panel.first().elementHandle().catch(() => null);

    let prevCount = 0;
    let sameCountTries = 0;
    const MAX_SAME = 3;

    for (let i = 0; i < 30; i++) {
      if (Date.now() > deadline) break;
      if (places.length >= total) break;

      // Count visible result links
      const links = page.locator('a[href*="maps/place"]');
      const linkCount = await links.count();
      stats.found = Math.max(stats.found, linkCount);

      if (linkCount === prevCount) {
        sameCountTries++;
        if (sameCountTries >= MAX_SAME) break;
      } else {
        sameCountTries = 0;
        prevCount = linkCount;
      }

      // Extract places
      if (linkCount > 0) {
        for (let j = places.length; j < Math.min(linkCount, total); j++) {
          if (Date.now() > deadline) break;

          try {
            const link = links.nth(j);

            // Get basic info before clicking
            const cardName = await link.locator('.fontHeadlineSmall').textContent().catch(() => '');
            const name = (cardName ?? '').trim();

            const cardAddress = await link.locator('.fontBodyMedium > span').first().textContent().catch(() => '');
            const address = (cardAddress ?? '').trim();

            // Rating
            let rating: number | null = null;
            let reviewsCount: number | null = null;
            const ratingAria = await link.locator('.fontBodyMedium > span[role="img"]').getAttribute('aria-label').catch(() => '');
            if (ratingAria) {
              const parts = ratingAria.match(/([\d,.]+)/g);
              if (parts && parts.length >= 1) {
                rating = parseFloat(parts[0].replace(',', '.'));
              }
              const numMatch = ratingAria.match(/([\d,.]+)\s*avaliaco?e?s/i);
              if (numMatch) {
                reviewsCount = parseInt(numMatch[1].replace(/\./g, '').replace(',', '.'));
              }
            }

            // Dedup by name
            if (places.some((p) => p.name === name && name !== '')) {
              continue;
            }

            // Click to open detail panel
            await link.click();
            await sleep(2000);

            // Extract details
            const detailName = await safeText(page, 'h1.DUwDvf.fontHeadlineLarge');

            const detailAddress = await safeText(page, 'button[data-item-id="address"] .fontBodyMedium');
            const detailWebsite = await safeText(page, 'a[data-item-id="authority"] .fontBodyMedium');
            const detailPhone = await safeText(page, 'button[data-item-id*="phone:tel:"] .fontBodyMedium');
            const detailIntro = await safeText(page, '.WeS02d.fontBodyMedium .PYvSYb');
            const detailType = await safeText(page, '.LBgpqf button.DkEaL');
            const detailHours = await safeText(page, 'button[data-item-id*="oh"] .fontBodyMedium');

            places.push({
              name: detailName || name,
              address: detailAddress || address,
              website: detailWebsite || '',
              phone_number: detailPhone || '',
              reviews_count: reviewsCount,
              reviews_average: rating,
              place_type: detailType || '',
              opens_at: detailHours || '',
              introduction: detailIntro || '',
              category: detailType || '',
            });
            stats.extracted++;
          } catch (err) {
            stats.errors++;
            console.error(`[maps-scraper] Erro extraindo place #${j}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      // Scroll
      if (panelEl) {
        await page.evaluate((el) => { el.scrollTop = el.scrollHeight; }, panelEl);
      } else {
        await page.evaluate(() => window.scrollBy(0, 800));
      }
      await sleep(1500);
    }

    return { places, stats };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
