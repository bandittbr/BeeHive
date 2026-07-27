/**
 * Google Maps Scraper (Node.js + Playwright)
 * ===========================================
 * Two-pass scraper:
 * 1. Extract card data (name, address, rating) — fast, no navigation
 * 2. Navigate to each place detail page to extract phone, website, full address
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

    // ── Pass 1: Navigate to search results and extract card data ───────────
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(search)}/`;
    debugLog(`[maps-scraper] Passo 1: ${searchUrl}`);
    await page.goto(searchUrl, {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
    await sleep(6000);

    if (Date.now() > deadline) throw new Error('Timeout: page load');

    // Accept cookies
    try {
      const cookieBtn = page.locator(
        'button:has-text("Aceitar"), button:has-text("Accept all"), button:has-text("Rejeitar"), [jsname="b3VHJd"]'
      ).first();
      if (await cookieBtn.isVisible({ timeout: 4000 })) {
        await cookieBtn.click();
        await sleep(1500);
        debugLog('[maps-scraper] Cookie aceito');
      }
    } catch { /* no cookie popup */ }

    // Wait for results panel
    debugLog('[maps-scraper] Aguardando resultados...');
    const panelSelectors = [
      'div[role="feed"]', 'div[aria-label*="Resultados"]',
      'div[aria-label*="Results"]', '.m6QErb',
    ];
    let panelFound = false;
    for (const sel of panelSelectors) {
      try {
        await page.locator(sel).first().waitFor({ state: 'visible', timeout: 8000 });
        debugLog(`[maps-scraper] Painel: ${sel}`);
        panelFound = true;
        break;
      } catch { /* next */ }
    }
    if (!panelFound) debugLog('[maps-scraper] Painel não encontrado');
    await sleep(2000);
    if (Date.now() > deadline) throw new Error('Timeout: results');

    // Find result links
    const allLinks = page.locator('a[href*="maps/place"]');
    const totalLinks = await allLinks.count();
    debugLog(`[maps-scraper] ${totalLinks} resultados encontrados`);
    stats.found = totalLinks;

    if (totalLinks === 0) {
      debugLog('[maps-scraper] Nenhum resultado');
      return { places, stats };
    }

    // Store hrefs for pass 2
    const hrefs: string[] = [];

    // Extract card data and collect hrefs
    for (let i = 0; i < Math.min(totalLinks, total); i++) {
      if (Date.now() > deadline) break;

      try {
        const link = allLinks.nth(i);
        const allText = await link.innerText({ timeout: 3000 });
        const lines = allText.split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        const cardName = lines[0];
        if (places.some((p) => p.name === cardName)) continue;

        // Collect href for detail navigation
        const href = await link.getAttribute('href').catch(() => '');
        if (href) hrefs.push(href);

        // Parse card data
        let rating: number | null = null;
        let reviewsCount: number | null = null;
        let cardAddress = '';
        let cardType = '';

        for (const line of lines.slice(1)) {
          if (line.match(/[\d,.]+\s*[★☆★]/) || line.match(/^\d[.,]\d/) || line.includes('estrela')) {
            const { rating: r, count: c } = await parseRating(line);
            if (r !== null) rating = r;
            if (c !== null) reviewsCount = c;
          } else if (line.match(/^\d/) || line.match(/[A-Za-z]+\s+\d+/)) {
            if (!cardAddress || line.length > cardAddress.length) cardAddress = line;
          } else if (line.includes('•')) {
            cardType = line;
          }
        }
        if (!cardAddress && lines.length > 2) cardAddress = lines[lines.length - 1];

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
        debugLog(`[maps-scraper] Card #${i}: "${cardName}"`);
      } catch (err) {
        stats.errors++;
        debugLog(`[maps-scraper] Erro card #${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ── Pass 2: Navigate to each place detail page for phone/website ─────
    if (hrefs.length > 0) {
      debugLog(`[maps-scraper] Passo 2: extraindo telefone/site de ${Math.min(hrefs.length, places.length)} lugares...`);

      for (let i = 0; i < Math.min(hrefs.length, places.length); i++) {
        if (Date.now() > deadline) {
          debugLog('[maps-scraper] Timeout no passo 2');
          break;
        }

        try {
          const href = hrefs[i];
          if (!href) continue;

          // Navigate to place detail page
          const placeUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;
          await Promise.race([
            page.goto(placeUrl, { timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => {}),
            sleep(15000),
          ]);
          await sleep(2000);

          // Skip if it's a collection page or redirected
          if (page.url().includes('/maps/search/') || !page.url().includes('/maps/place/')) {
            debugLog(`[maps-scraper] Lugar #${i}: redirecionado, pulando detalhes`);
            continue;
          }

          // Extract phone
          let phone = '';
          const phoneSelectors = [
            'button[data-item-id*="phone:tel:"]',
            '[data-item-id*="phone"]',
            'a[data-item-id*="phone"]',
            'button:has([data-item-id*="phone"])',
          ];
          for (const sel of phoneSelectors) {
            try {
              const el = page.locator(sel).first();
              const text = await el.textContent({ timeout: 2000 });
              if (text?.trim()) { phone = text.trim(); break; }
            } catch { /* next */ }
          }
          // Try alternate: look for clickable phone
          if (!phone) {
            try {
              phone = await page.locator('[class*="phone"]').first().textContent({ timeout: 1000 }).catch(() => '') || '';
            } catch { }
          }

          // Extract website
          let website = '';
          const websiteSelectors = [
            'a[data-item-id="authority"]',
            '[data-item-id="authority"] a',
            'a:has([data-item-id="authority"])',
            'a[class*="website"]',
          ];
          for (const sel of websiteSelectors) {
            try {
              const el = page.locator(sel).first();
              const href = await el.getAttribute('href', { timeout: 2000 }).catch(() => '');
              if (href) { website = href; break; }
            } catch { /* next */ }
          }

          // Extract full address from detail panel
          let detailAddress = '';
          const addrSelectors = [
            'button[data-item-id="address"]',
            '[data-item-id="address"]',
            'button:has([data-item-id="address"])',
          ];
          for (const sel of addrSelectors) {
            try {
              const el = page.locator(sel).first();
              const text = await el.textContent({ timeout: 2000 });
              if (text?.trim()) { detailAddress = text.trim(); break; }
            } catch { /* next */ }
          }

          // Clean phone number (remove icon chars, keep only digits/spaces/+-)
          phone = phone.replace(/[^\d\s\+\-\(\)]/g, '').trim();
          // Clean address icon chars
          if (detailAddress) detailAddress = detailAddress.replace(/[^\w\s,.\-À-ÿ0-9\/]/g, '').trim();
          // Clean website URL
          if (website) {
            website = website.replace(/^\/\//, 'https://'); // Fix protocol-relative URLs
            if (!website.startsWith('http')) website = '';
          }

          // Update place with extracted details
          if (phone || website || detailAddress) {
            if (places[i]) {
              places[i].phone_number = phone || places[i].phone_number;
              places[i].website = website || places[i].website;
              places[i].address = detailAddress || places[i].address;
            }
            debugLog(`[maps-scraper] Detalhe #${i}: tel=${phone || 'n/a'} site=${website ? website.slice(0, 40) : 'n/a'}`);
          } else {
            debugLog(`[maps-scraper] Detalhe #${i}: sem dados extra`);
          }

          // Navigate back to search results
          await Promise.race([
            page.goto(searchUrl, { timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => {}),
            sleep(15000),
          ]);
          await sleep(2000);

        } catch (err) {
          stats.errors++;
          debugLog(`[maps-scraper] Erro detalhe #${i}: ${err instanceof Error ? err.message : String(err)}`);
          // Try to get back to search results
          try {
            await Promise.race([
              page.goto(searchUrl, { timeout: 10000 }).catch(() => {}),
              sleep(10000),
            ]);
          } catch {}
        }
      }
    }

    debugLog(`[maps-scraper] Finalizado: ${stats.extracted} extraídos, ${stats.errors} erros`);
    return { places, stats };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
