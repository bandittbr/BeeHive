/**
 * Google Maps Scraper (Node.js + Playwright)
 * ===========================================
 * Searches Google Maps and extracts place data.
 * Uses multiple fallback selectors to handle Google's frequent UI changes.
 */

import { chromium, Browser } from 'playwright';
import { debugLog } from '../debug-log.js';

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

const DETAIL_SELECTORS = {
  name: [
    'h1.DUwDvf',
    'h1.fontHeadlineLarge',
    'h1[class*="headline"]',
    'h1',
    '[class*="header-title"] h1',
  ],
  address: [
    'button[data-item-id="address"]',
    'button[data-item-id*="address"]',
    '[data-item-id="address"]',
    'button:has([data-item-id="address"])',
  ],
  website: [
    'a[data-item-id="authority"]',
    '[data-item-id="authority"] a',
    'a:has([data-item-id="authority"])',
  ],
  phone: [
    'button[data-item-id*="phone:tel:"]',
    '[data-item-id*="phone"]',
    'button:has([data-item-id*="phone"])',
  ],
  type: [
    '.LBgpqf button.DkEaL',
    'button[jsaction*="category"]',
    '[class*="category"] button',
  ],
  hours: [
    'button[data-item-id*="oh"]',
    '[data-item-id*="oh"]',
    'button:has([data-item-id*="oh"])',
  ],
  intro: [
    '.WeS02d.fontBodyMedium .PYvSYb',
    '[class*="introduction"]',
    '[class*="description"] p',
  ],
};

const CARD_SELECTORS = {
  name: [
    '.fontHeadlineSmall',
    '[class*="headline"]',
    '.qBF1Pd',
    'div[role="heading"]',
  ],
  address: [
    '.fontBodyMedium > span',
    '[class*="body-medium"]',
    '.hfpxzc + div span',
    '[class*="address"]',
  ],
  rating: [
    '.fontBodyMedium > span[role="img"]',
    '[role="img"][aria-label*="estrela"]',
    '[role="img"][aria-label*="star"]',
    'span:has([aria-label*="estrela"])',
    'span:has([aria-label*="star"])',
  ],
};

async function extractText(page: Page, selectors: string[], within?: string): Promise<string> {
  for (const sel of selectors) {
    try {
      const fullSel = within ? `${within} ${sel}` : sel;
      const el = page.locator(fullSel).first();
      const text = (await el.textContent())?.trim() ?? '';
      if (text) return text;
    } catch { /* try next */ }
  }
  return '';
}

async function extractTextFromEl(el: any, selectors: string[]): Promise<string> {
  for (const sel of selectors) {
    try {
      const sub = el.locator(sel).first();
      const text = (await sub.textContent())?.trim() ?? '';
      if (text) return text;
    } catch { /* try next */ }
  }
  return '';
}

async function parseRating(text: string): Promise<{ rating: number | null; count: number | null }> {
  let rating: number | null = null;
  let count: number | null = null;
  const parts = text.match(/([\d,.]+)/g);
  if (parts && parts.length >= 1) {
    rating = parseFloat(parts[0].replace(',', '.'));
  }
  const numMatch = text.match(/([\d,.]+)\s*(avaliaç[ãa]o|avaliaç[ãa]ões|reviews?|avalia)/i);
  if (numMatch) {
    count = parseInt(numMatch[1].replace(/\./g, '').replace(',', '.'));
  }
  return { rating, count };
}

// ─── Main Scraper ───────────────────────────────────────────────────────────────

export async function scrapeGoogleMaps(
  req: ScrapeRequest,
): Promise<{ places: ScrapedPlace[]; stats: ScrapeStats }> {
  const { search, total = 10 } = req;
  const headless = req.headless !== false;

  const places: ScrapedPlace[] = [];
  const stats: ScrapeStats = { found: 0, extracted: 0, errors: 0 };

  let browser: Browser | null = null;

  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
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

    // Navigate directly to search URL (avoids the search box issue)
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(search)}/`;
    debugLog(`[maps-scraper] Navigando para: ${searchUrl}`);
    await page.goto(searchUrl, {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    await sleep(6000); // Let Maps JS settle

    if (Date.now() > deadline) throw new Error('Timeout: page load');

    // Accept cookies if present
    try {
      const cookieBtn = page.locator(
        'button:has-text("Aceitar"), button:has-text("Accept all"), button:has-text("Rejeitar"), [jsname="b3VHJd"]'
      ).first();
      if (await cookieBtn.isVisible({ timeout: 4000 })) {
        await cookieBtn.click();
        await sleep(1500);
        debugLog('[maps-scraper] Cookie popup aceito');
      }
    } catch {
      debugLog('[maps-scraper] Sem popup de cookies');
    }

    if (Date.now() > deadline) throw new Error('Timeout: cookies');

    // Wait for results panel to appear
    debugLog('[maps-scraper] Aguardando resultados...');
    const resultPanelSelectors = [
      'div[role="feed"]',
      'div[aria-label*="Resultados"]',
      'div[aria-label*="Results"]',
      '.m6QErb',
      'div.section-listbox',
      '[class*="results"]',
    ];

    let panelFound = false;
    for (const sel of resultPanelSelectors) {
      try {
        await page.locator(sel).first().waitFor({ state: 'visible', timeout: 8000 });
        debugLog(`[maps-scraper] Painel de resultados encontrado: ${sel}`);
        panelFound = true;
        break;
      } catch {
        continue;
      }
    }

    if (!panelFound) {
      debugLog('[maps-scraper] Aviso: Nenhum seletor de painel encontrado. Tentando prosseguir...');
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: '/tmp/maps-debug.png', type: 'png' }).catch(() => {});
      } catch {}
    }

    await sleep(2000);

    if (Date.now() > deadline) throw new Error('Timeout: results');

    // ── Extract result items ──────────────────────────────────────────────
    // Try multiple selectors for result items
    const itemSelectors = [
      'a[href*="maps/place"]',
      'div.Nv2PK',
      'div[jsaction*="mouseover"] > a',
      '[role="feed"] > div > a',
      'div.section-result',
      'a[href*="/maps/place"]',
    ];

    let resultLinks: any = null;
    let linkCount = 0;

    for (const sel of itemSelectors) {
      const items = page.locator(sel);
      const count = await items.count();
      debugLog(`[maps-scraper] Seletor "${sel}": ${count} itens`);
      if (count > 0) {
        resultLinks = items;
        linkCount = count;
        break;
      }
    }

    if (!resultLinks || linkCount === 0) {
      debugLog('[maps-scraper] Nenhum resultado encontrado com seletores conhecidos');
      // Last resort: try to find any clickable elements in the sidebar
      const allLinks = page.locator('a');
      const allCount = await allLinks.count();
      debugLog(`[maps-scraper] Total de links na página: ${allCount}`);
      // Try the first few
      for (let i = 0; i < Math.min(allCount, 20); i++) {
        const href = await allLinks.nth(i).getAttribute('href').catch(() => '');
        if (href && href.includes('/maps/place')) {
          debugLog(`[maps-scraper] Link Google Maps encontrado: ${href?.slice(0, 80)}`);
        }
      }
      return { places, stats };
    }

    stats.found = linkCount;

    // ── Iterate through results ────────────────────────────────────────────
    for (let i = 0; i < Math.min(linkCount, total); i++) {
      if (Date.now() > deadline) {
        debugLog('[maps-scraper] Timeout atingido, parando extração');
        break;
      }

      try {
        const link = resultLinks.nth(i);

        // 1. Extract card-level info first (as fallback)
        const cardName = await extractTextFromEl(link, CARD_SELECTORS.name);
        const cardAddress = await extractTextFromEl(link, CARD_SELECTORS.address);
        const ratingText = await extractTextFromEl(link, CARD_SELECTORS.rating);
        const { rating, count: reviewsCount } = await parseRating(ratingText);

        // Skip if no name
        if (!cardName) {
          debugLog(`[maps-scraper] Item #${i}: sem nome, pulando`);
          continue;
        }

        // Dedup by name
        if (places.some((p) => p.name === cardName)) {
          debugLog(`[maps-scraper] Item #${i}: duplicado "${cardName}", pulando`);
          continue;
        }

        debugLog(`[maps-scraper] Item #${i}: "${cardName}"`);

        // 2. Click to open detail panel
        // Use noWaitAfter to avoid hanging on SPA navigation
        try {
          await link.click({ timeout: 5000, noWaitAfter: true });
          await sleep(3000);
        } catch (clickErr) {
          debugLog(`[maps-scraper] Erro ao clicar no item #${i}: ${clickErr}`);
          // Extract card-level data as fallback
          places.push({
            name: cardName,
            address: cardAddress,
            website: '',
            phone_number: '',
            reviews_count: reviewsCount,
            reviews_average: rating,
            place_type: '',
            opens_at: '',
            introduction: '',
            category: '',
          });
          stats.extracted++;
          continue;
        }

        // 3. Extract detail panel info
        const detailName = await extractText(page, DETAIL_SELECTORS.name);
        let fullAddress = '';
        const addrEl = await extractText(page, DETAIL_SELECTORS.address);
        if (addrEl) {
          // Address may be inside nested spans
          try {
            const addrBtn = page.locator(DETAIL_SELECTORS.address[0]).first();
            fullAddress = (await addrBtn.locator('.fontBodyMedium').textContent())?.trim() ?? addrEl;
          } catch {
            fullAddress = addrEl;
          }
        }
        const website = await extractText(page, DETAIL_SELECTORS.website);
        const phone = await extractText(page, DETAIL_SELECTORS.phone);
        const placeType = await extractText(page, DETAIL_SELECTORS.type);
        const hours = await extractText(page, DETAIL_SELECTORS.hours);
        const intro = await extractText(page, DETAIL_SELECTORS.intro);

        places.push({
          name: detailName || cardName,
          address: fullAddress || cardAddress,
          website: website || '',
          phone_number: phone || '',
          reviews_count: reviewsCount,
          reviews_average: rating,
          place_type: placeType || '',
          opens_at: hours || '',
          introduction: intro || '',
          category: placeType || '',
        });
        stats.extracted++;

        debugLog(`[maps-scraper] Extraído #${i}: "${detailName || cardName}"`);
      } catch (err) {
        stats.errors++;
        debugLog(`[maps-scraper] Erro extraindo item #${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    debugLog(`[maps-scraper] Finalizado: ${stats.extracted} extraídos de ${stats.found} encontrados, ${stats.errors} erros`);
    return { places, stats };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
