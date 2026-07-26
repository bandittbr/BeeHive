/**
 * Google Maps Scraper (Node.js + Puppeteer)
 * ==========================================
 * Searches Google Maps and extracts place data.
 * Replaces the legacy Python scraper for Railway compatibility.
 *
 * Usage:
 *   const leads = await scrapeGoogleMaps({ search: "pizzaria em Goiânia", total: 20 });
 */

import puppeteer, { Browser } from 'puppeteer';
import { resolveChromiumPath } from '../chromium.js';

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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeText(page: Page, selector: string, attr?: string): Promise<string> {
  try {
    const el = await page.$(selector);
    if (!el) return '';
    if (attr) {
      return (await el.evaluate((e, a) => e.getAttribute(a as string), attr)) ?? '';
    }
    return (await el.evaluate((e) => e.textContent?.trim() ?? ''));
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

  // Overall timeout: 4 minutes
  const TIMEOUT_MS = 4 * 60 * 1000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Scraper timeout após ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS),
  );

  const scrapePromise = (async () => {
    const chromePath = await resolveChromiumPath();
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: headless ? 'new' : false,
      protocolTimeout: 120_000, // 2 min for individual CDP calls
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    };
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    );
    page.setDefaultNavigationTimeout(90_000);
    page.setDefaultTimeout(30_000);

    // Navigate to Google Maps
    // NOTA: Não usar 'networkidle2' — Google Maps é SPA e nunca fica idle.
    // 'domcontentloaded' é suficiente, depois esperamos um tempo fixo.
    await page.goto('https://www.google.com/maps/@-14.23,-51.92,4z', {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    // Give Maps time to render the search box
    await sleep(5000);
    await sleep(3000);

    // Accept cookies if present (try multiple selectors)
    for (const sel of ['[jsname="b3VHJd"]', 'button:has-text("Aceitar")', 'button:has-text("Accept all")']) {
      try {
        const btn = await page.$(sel);
        if (btn) { await btn.click(); await sleep(1000); break; }
      } catch { /* next */ }
    }

    // Type search and press Enter
    const searchInputSel = 'input[name="q"]';
    try {
      await page.waitForSelector(searchInputSel, { timeout: 15000 });
    } catch {
      // If search box not found directly, try clicking the search button first
      try {
        const searchBtn = await page.$('button[aria-label="Search"]');
        if (searchBtn) await searchBtn.click();
        await sleep(2000);
        await page.waitForSelector(searchInputSel, { timeout: 10000 });
      } catch { /* last attempt */ }
    }
    await page.type(searchInputSel, search, { delay: 40 }); // faster typing
    await page.keyboard.press('Enter');

    // Wait for results panel to appear
    await sleep(3000);
    try {
      await page.waitForSelector('a[href*="maps/place"]', { timeout: 30000 });
    } catch {
      // Maybe Google Maps changed layout — try alternative selector
      await page.waitForSelector('[role="feed"]', { timeout: 20000 }).catch(() => {});
    }
    await sleep(2000);

    // ── Scroll results panel to load more ────────────────────────────────────
    const resultsPanel = 'div[role="feed"]';
    await page.waitForSelector(resultsPanel, { timeout: 15000 }).catch(() => {});
    const panel = await page.$(resultsPanel);

    let prevCount = 0;
    let sameCountTries = 0;
    const MAX_SAME = 3;

    for (let i = 0; i < 30; i++) {
      if (places.length >= total) break;

      // Count visible result links
      const links = await page.$$('a[href*="maps/place"]');
      stats.found = Math.max(stats.found, links.length);

      if (links.length === prevCount) {
        sameCountTries++;
        if (sameCountTries >= MAX_SAME) break;
      } else {
        sameCountTries = 0;
        prevCount = links.length;
      }

      // Extract places from currently visible results
      if (links.length > 0) {
        for (let j = places.length; j < Math.min(links.length, total); j++) {
          try {
            const link = links[j];
            if (!link) continue;

            // Get basic info from the search result card before clicking
            const name = await link.evaluate((el) => {
              const nameEl = el.querySelector('.fontHeadlineSmall');
              return nameEl?.textContent?.trim() ?? '';
            });

            const address = await link.evaluate((el) => {
              const addrEl = el.querySelector('.fontBodyMedium > span');
              return addrEl?.textContent?.trim() ?? '';
            });

            // Rating from the search cards
            let rating: number | null = null;
            let reviewsCount: number | null = null;
            const ratingText = await link.evaluate((el) => {
              const r = el.querySelector('.fontBodyMedium > span[role="img"]');
              return r?.getAttribute('aria-label') ?? '';
            });
            if (ratingText) {
              const parts = ratingText.match(/([\d,.]+)/g);
              if (parts && parts.length >= 1) {
                rating = parseFloat(parts[0].replace(',', '.'));
              }
              const numMatch = ratingText.match(/([\d,.]+)\s*avaliaco?e?s/i);
              if (numMatch) {
                reviewsCount = parseInt(numMatch[1].replace(/\./g, '').replace(',', '.'));
              }
            }

            // Click to open detail panel
            await link.click();
            await sleep(2000);
            await page.waitForTimeout(500);

            // Check if already have this place (dedup by name)
            if (places.some((p) => p.name === name && name !== '')) {
              continue;
            }

            // ── Extract details from the side panel ──
            const detailPanel = 'div[role="main"]';

            // Name (from detail panel header)
            const detailName = await safeText(page, 'h1.DUwDvf.fontHeadlineLarge');

            // Address
            const detailAddress = await safeText(
              page,
              'button[data-item-id="address"] .fontBodyMedium',
            );

            // Website
            const detailWebsite = await safeText(
              page,
              'a[data-item-id="authority"] .fontBodyMedium',
            );

            // Phone
            const detailPhone = await safeText(
              page,
              'button[data-item-id*="phone:tel:"] .fontBodyMedium',
            );

            // Introduction/description
            const detailIntro = await safeText(page, '.WeS02d.fontBodyMedium .PYvSYb');

            // Place type (category)
            const detailType = await safeText(page, '.LBgpqf button.DkEaL');

            // Opening hours
            const detailHours = await safeText(
              page,
              'button[data-item-id*="oh"] .fontBodyMedium',
            );

            const place: ScrapedPlace = {
              name: detailName || name,
              address: detailAddress || address || '',
              website: detailWebsite || '',
              phone_number: detailPhone || '',
              reviews_count: reviewsCount,
              reviews_average: rating,
              place_type: detailType || '',
              opens_at: detailHours || '',
              introduction: detailIntro || '',
              category: detailType || '',
            };

            places.push(place);
            stats.extracted++;
          } catch (err) {
            stats.errors++;
            console.error(
              `[maps-scraper] Erro extraindo place #${j}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      // Scroll the results panel to load more
      if (panel) {
        await panel.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
      } else {
        await page.evaluate(() => window.scrollBy(0, 800));
      }
      await sleep(1500);
    }

    return { places, stats };
  })();

  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
