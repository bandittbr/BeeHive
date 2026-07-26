// Executor de leads: scraping Google Maps + IA.
// Usa Puppeteer diretamente (Node.js) — sem dependências Python.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer, { Browser } from 'puppeteer';
import { WORKSPACE_ROOT } from '../workspace.js';
import { executeCapability } from '../kernel-bridge.js';
import { scrapeGoogleMaps } from './googleMapsScraper.js';

export type { ScrapedPlace, ScrapeRequest } from './googleMapsScraper.js';

export interface LeadScrapeRequest {
  search: string;
  total?: number;
  categories?: string;
  headless?: boolean;
}

export interface RawLead {
  name: string;
  address?: string;
  website?: string;
  phone_number?: string;
  reviews_count?: number;
  reviews_average?: number;
  place_type?: string;
  opens_at?: string;
  introduction?: string;
  category?: string;
}

/**
 * Run the Google Maps scraper (Node.js/Puppeteer) and return raw leads.
 */
export async function runScraper(
  req: LeadScrapeRequest,
  onChunk?: (kind: 'stdout' | 'stderr', data: string) => void,
): Promise<RawLead[]> {
  const result = await scrapeGoogleMaps({
    search: req.search,
    total: req.total ?? 20,
    headless: req.headless !== false,
  });

  onChunk?.('stdout', `[maps-scraper] Encontrados ${result.stats.found}, extraídos ${result.stats.extracted}, erros ${result.stats.errors}\n`);

  return result.places.map((p) => ({
    name: p.name,
    address: p.address,
    website: p.website,
    phone_number: p.phone_number,
    reviews_count: p.reviews_count,
    reviews_average: p.reviews_average,
    place_type: p.place_type,
    opens_at: p.opens_at,
    introduction: p.introduction,
    category: p.category,
  }));
}

/**
 * Identifica o segmento da empresa usando IA.
 */
export async function identifySegment(
  leadName: string,
  placeType: string,
  introduction: string,
): Promise<string> {
  const prompt = `Com base no nome "${leadName}", tipo "${placeType}" e descrição "${introduction || '(sem descrição)'}", 
identifique o SEGMENTO/ramo principal desta empresa brasileira.

Responda APENAS com uma palavra ou frase curta (máx 3 palavras) como:
"Restaurante", "Salão de Beleza", "Oficina Mecânica", "Clínica Odontológica", "Mercado", "Academia", "Pet Shop", "Advocacia", etc.`;

  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    return content.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim() || 'Outros';
  } catch {
    return 'Outros';
  }
}

/**
 * Gera uma mensagem de proposta personalizada para o lead.
 */
export async function generateProposalMessage(
  leadName: string,
  segment: string,
): Promise<string> {
  const prompt = `Você é um consultor de marketing digital. Crie uma mensagem curta e profissional para enviar 
via WhatsApp para o proprietário de "${leadName}" (segmento: ${segment}).

A mensagem deve:
1. Se apresentar de forma amigável
2. Oferecer um site moderno com atendimento via WhatsApp integrado
3. Mencionar que pode mostrar uma amostra grátis personalizada para o negócio dele
4. Ser educada e não invasiva
5. TER NO MÁXIMO 200 caracteres

Responda APENAS com o texto da mensagem, sem aspas.`;

  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    return result?.outputs?.content ?? 'Olá! Tudo bem? Me chamo Gabriel e trabalho com criação de sites modernos com WhatsApp integrado. Posso mostrar uma amostra grátis para o seu negócio?';
  } catch {
    return 'Olá! Tudo bem? Me chamo Gabriel e trabalho com criação de sites modernos com WhatsApp integrado. Posso mostrar uma amostra grátis para o seu negócio?';
  }
}

/**
 * Converte um arquivo HTML em uma imagem PNG usando Puppeteer.
 */
async function htmlToPng(
  htmlPath: string,
  outputPng: string,
): Promise<void> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Load the HTML file
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });

    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts?.ready);
    await new Promise((r) => setTimeout(r, 1000));

    // Screenshot just the viewport (not full page)
    await page.screenshot({ path: outputPng, type: 'png' });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Gera um preview em PNG do site de amostra para o lead.
 * Passo 1: IA gera o HTML do site.
 * Passo 2: Salva o HTML em arquivo temporário.
 * Passo 3: Converte o HTML em PNG via Puppeteer.
 * Passo 4: Retorna o caminho do PNG.
 *
 * @returns O caminho absoluto do arquivo PNG gerado.
 */
export async function generateSampleSite(
  leadId: string,
  leadName: string,
  segment: string,
): Promise<string> {
  // 1) Gerar HTML
  const prompt = `Crie um site HTML moderno, responsivo e profissional para "${leadName}" (segmento: ${segment}).

Regras:
- Use CSS moderno (flexbox, grid, variáveis)
- Design limpo e profissional
- Inclua: header com nome, hero section, serviços/produtos, contato com WhatsApp
- O número de WhatsApp deve ser placeholder: (11) 99999-9999
- Inclua um botão flutuante do WhatsApp
- Use cores apropriadas para o segmento
- Totalmente em português
- Apenas HTML + CSS (sem JS frameworks)

Responda APENAS com o código HTML completo dentro de um bloco \`\`\`html ... \`\`\``;

  let html: string;
  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    const match = content.match(/```html\s*([\s\S]*?)```/);
    html = match?.[1]?.trim() ?? generateFallbackSite(leadName, segment);
  } catch {
    html = generateFallbackSite(leadName, segment);
  }

  // 2) Salvar HTML em arquivo temporário
  const siteDir = path.join(WORKSPACE_ROOT, 'sites', 'leads', leadId);
  fs.mkdirSync(siteDir, { recursive: true });
  const htmlPath = path.join(siteDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // 3) Converter HTML em PNG
  const pngPath = path.join(siteDir, 'preview.png');
  try {
    await htmlToPng(htmlPath, pngPath);
  } catch (e) {
    console.error('[leads] Falha ao gerar screenshot, mantendo HTML:', e);
    // Fallback: retorna o caminho do HTML mesmo sem screenshot
    return htmlPath;
  }

  return pngPath;
}

function generateFallbackSite(name: string, segment: string): string {
  const colors: Record<string, { primary: string; bg: string }> = {
    'Restaurante': { primary: '#e74c3c', bg: '#fdf2f2' },
    'Salão de Beleza': { primary: '#e91e63', bg: '#fce4ec' },
    'Oficina Mecânica': { primary: '#1565c0', bg: '#e3f2fd' },
    'Clínica': { primary: '#2e7d32', bg: '#e8f5e9' },
    'Academia': { primary: '#ff6f00', bg: '#fff3e0' },
    'Pet Shop': { primary: '#6a1b9a', bg: '#f3e5f5' },
  };
  const color = colors[segment] ?? { primary: '#2563eb', bg: '#f0f7ff' };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — ${segment}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: ${color.bg}; color: #1a1a2e; }
    .header { background: ${color.primary}; color: white; padding: 2rem; text-align: center; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header p { opacity: 0.9; }
    .hero { padding: 4rem 2rem; text-align: center; max-width: 800px; margin: 0 auto; }
    .hero h2 { font-size: 1.5rem; color: ${color.primary}; margin-bottom: 1rem; }
    .hero p { color: #555; line-height: 1.6; }
    .services { padding: 3rem 2rem; background: white; }
    .services h3 { text-align: center; color: ${color.primary}; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; max-width: 900px; margin: 0 auto; }
    .card { background: ${color.bg}; padding: 1.5rem; border-radius: 12px; text-align: center; }
    .card h4 { color: ${color.primary}; margin-bottom: 0.5rem; }
    .card p { color: #666; font-size: 0.9rem; }
    .contact { padding: 3rem 2rem; text-align: center; }
    .contact h3 { color: ${color.primary}; margin-bottom: 1rem; }
    .contact p { color: #555; margin-bottom: 0.5rem; }
    .footer { background: #1a1a2e; color: #ccc; text-align: center; padding: 1.5rem; font-size: 0.85rem; }
    .whatsapp-float { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; background: #25d366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); text-decoration: none; font-size: 28px; color: white; transition: transform 0.2s; }
    .whatsapp-float:hover { transform: scale(1.1); }
  </style>
</head>
<body>
  <header class="header">
    <h1>${name}</h1>
    <p>${segment} de confiança</p>
  </header>

  <section class="hero">
    <h2>Bem-vindo à ${name}</h2>
    <p>Somos referência em ${segment.toLowerCase()} na região. Nosso compromisso é oferecer o melhor serviço com qualidade e dedicação.</p>
  </section>

  <section class="services">
    <h3>Nossos Serviços</h3>
    <div class="grid">
      <div class="card">
        <h4>Atendimento Personalizado</h4>
        <p>Cada cliente é único. Oferecemos soluções sob medida para suas necessidades.</p>
      </div>
      <div class="card">
        <h4>Qualidade Garantida</h4>
        <p>Trabalhamos com os melhores profissionais e materiais do mercado.</p>
      </div>
      <div class="card">
        <h4>Preço Justo</h4>
        <p>Transparência total nos valores, sem surpresas no final.</p>
      </div>
    </div>
  </section>

  <section class="contact">
    <h3>Entre em Contato</h3>
    <p>📍 Endereço: Av. Principal, 1000</p>
    <p>📞 (11) 99999-9999</p>
    <p>✉️ contato@${name.toLowerCase().replace(/\s+/g, '')}.com.br</p>
    <p style="margin-top: 1rem; font-size: 0.9rem; color: #888;">Funcionamento: Seg-Sáb 08h-18h</p>
  </section>

  <footer class="footer">
    <p>&copy; 2026 ${name}. Todos os direitos reservados.</p>
  </footer>

  <a href="https://wa.me/5511999999999" target="_blank" class="whatsapp-float" title="Fale conosco pelo WhatsApp">
    &#x1F4AC;
  </a>
</body>
</html>`;
}
