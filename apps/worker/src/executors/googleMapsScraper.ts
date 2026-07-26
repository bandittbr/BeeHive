/**
 * Google Maps Scraper (Node.js + Puppeteer)
 * ==========================================
 * Searches Google Maps and extracts place data.
 * Replaces the legacy Python scraper for Railway compatibility.
 *
 * Usage:
 *   const leads = await scrapeGoogleMaps({ search: "pizzaria em Goiânia", total: 20 });
 */

import puppeteer, { Browser, Page } from 'puppeteer';

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

  try {
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    );

    // Navigate to Google Maps
    await page.goto('https://www.google.com/maps/@-14.23,-51.92,4z', {
      timeout: 60000,
      waitUntil: 'networkidle2',
    });
    await sleep(3000);

    // Accept cookies if present
    try {
      const cookieBtn = await page.$('[jsname="b3VHJd"]');
      if (cookieBtn) await cookieBtn.click();
      await sleep(1000);
    } catch {
      // no cookie popup
    }

    // Type search and press Enter
    const searchInputSel = 'input[name="q"]';
    await page.waitForSelector(searchInputSel, { timeout: 10000 });
    await page.type(searchInputSel, search, { delay: 80 });
    await page.keyboard.press('Enter');

    // Wait for results panel to appear
    await page.waitForSelector('a[href*="maps/place"]', { timeout: 20000 });
    await sleep(2000);

    // ── Scroll results panel to load more ────────────────────────────────────
    const resultsPanel = 'div[role="feed"]';
    await page.waitForSelector(resultsPanel, { timeout: 10000 }).catch(() => {});
    const panel = await page.$(resultsPanel);

    let prevCount = 0;
    let sameCountTries = 0;
    const MAX_SAME = 5;

    for (let i = 0; i < 50; i++) {
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
            await sleep(2500);
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
      await sleep(2000);
    }

    return { places, stats };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
