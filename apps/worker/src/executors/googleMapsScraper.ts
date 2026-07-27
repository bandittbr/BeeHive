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

async function unusedExtractTextFromEl(el: any, selectors: string[], timeoutMs = 2000): Promise<string> {
  for (const sel of selectors) {
    try {
      const sub = el.locator(sel).first();
      const text = (await sub.textContent({ timeout: timeoutMs }))?.trim() ?? '';
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

    // ── Extract data from result cards (no navigation — faster & more reliable) ──
    // Google Maps changes CSS classes frequently; use innerText + line parsing
    const links = page.locator('a[href*="maps/place"]');
    const totalLinks = await links.count();
    debugLog(`[maps-scraper] Extraindo dados de ${totalLinks} cards...`);

    for (let i = 0; i < Math.min(totalLinks, total); i++) {
      if (Date.now() > deadline) {
        debugLog('[maps-scraper] Timeout atingido, parando extração');
        break;
      }

      try {
        const link = links.nth(i);

        // Get ALL visible text from the card as lines
        const allText = await link.innerText({ timeout: 3000 });
        const lines = allText.split('\n').map((l: string) => l.trim()).filter(Boolean);

        if (lines.length === 0) {
          debugLog(`[maps-scraper] Card #${i}: vazio, pulando`);
          continue;
        }

        // First non-empty line is usually the name
        const cardName = lines[0];

        // Dedup
        if (places.some((p) => p.name === cardName)) {
          debugLog(`[maps-scraper] Card #${i}: duplicado "${cardName}", pulando`);
          continue;
        }

        // Parse rating and reviews from any line
        let rating: number | null = null;
        let reviewsCount: number | null = null;
        let cardAddress = '';
        let cardType = '';

        for (const line of lines) {
          // Check for rating pattern like "4,5 ★" or "4.5 (200)" or "4,5 estrelas"
          if (line.match(/[\d,.]+\s*[★☆★]/) || line.match(/^\d[.,]\d/) || line.includes('estrela')) {
            const { rating: r, count: c } = await parseRating(line);
            if (r !== null) rating = r;
            if (c !== null) reviewsCount = c;
          }
          // Check for address patterns (usually longer text with numbers)
          else if (line.match(/^\d/) || line.match(/[A-Za-z]+\s+\d+/)) {
            if (!cardAddress || line.length > cardAddress.length) cardAddress = line;
          }
          // Check for place type
          else if (line.includes('•')) {
            cardType = line;
          }
        }

        // If no address found by pattern, use the last line (often address)
        if (!cardAddress && lines.length > 2) {
          cardAddress = lines[lines.length - 1];
        }

        places.push({
          name: cardName,
          address: cardAddress || '',
          website: '',
          phone_number: '',
          reviews_count: reviewsCount,
          reviews_average: rating,
          place_type: cardType || '',
          opens_at: '',
          introduction: '',
          category: cardType || '',
        });
        stats.extracted++;
        debugLog(`[maps-scraper] Extraído #${i}: "${cardName}"${cardAddress ? ` - ${cardAddress}` : ''}`);
      } catch (err) {
        stats.errors++;
        debugLog(`[maps-scraper] Erro extraindo card #${i}: ${err instanceof Error ? err.message : String(err)}`);
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
