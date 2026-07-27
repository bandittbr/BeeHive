// Executor de leads: scraping Google Maps + IA.
// Usa Puppeteer diretamente (Node.js) — sem dependências Python.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, Browser } from 'playwright';
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
 * Define o tipo de solução digital ideal para o segmento do lead.
 */
async function suggestProjectType(leadName: string, segment: string): Promise<{
  type: string;
  title: string;
  description: string;
  features: string[];
}> {
  const prompt = `Você é um consultor de transformação digital. Analise o negócio "${leadName}" (segmento: ${segment})
e sugira qual PACOTE DE SOLUÇÕES DIGITAIS seria MAIS IMPACTANTE para eles.

ESCOLHA UMA COMBINAÇÃO PRINCIPAL entre:

=== SITES ===
- "site-cardapio" → site com cardápio digital + pedidos via WhatsApp
- "site-agendamento" → site com agendamento online + WhatsApp
- "site-vitrine" → site vitrine profissional com portfólio + WhatsApp
- "site-ecommerce" → site com catálogo de produtos + compras WhatsApp
- "site-servicos" → site de serviços com orçamento via WhatsApp

=== REDES SOCIAIS ===
- "social-conteudo" → gestão de conteúdo + postagens automáticas no Instagram/Facebook
- "social-campanha" → campanhas sazonais + conteúdo orgânico + anúncios
- "social-completo" → conteúdo diário + design + relatórios de performance

=== COMPLETO ===
- "completo-presenca" → site profissional + redes sociais gerenciadas + WhatsApp
- "completo-vendas" → e-commerce + Instagram shop + WhatsApp commerce

Responda APENAS com um JSON neste formato (sem \`\`\`):
{"type":"site-vitrine","title":"Título Impactante","description":"Descrição curta da solução completa","features":["feature1","feature2","feature3","feature4"]}`;

  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    const cleaned = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
    const parsed = JSON.parse(cleaned);
    return {
      type: parsed.type || 'site-vitrine',
      title: parsed.title || `${leadName} — Digital`,
      description: parsed.description || 'Solução digital personalizada',
      features: Array.isArray(parsed.features) ? parsed.features.slice(0, 4) : ['Site moderno', 'WhatsApp integrado', 'Redes sociais automatizadas', 'Design responsivo'],
    };
  } catch {
    return {
      type: 'completo-presenca',
      title: `${leadName} — Presença Digital Completa`,
      description: 'Site profissional + Redes Sociais Gerenciadas + WhatsApp',
      features: ['Site moderno e responsivo', 'Redes sociais com conteúdo automatizado', 'WhatsApp商务 integrado', 'Relatórios de performance'],
    };
  }
}

/**
 * Gera uma mensagem de proposta personalizada para o lead, mencionando o preview.
 */
export async function generateProposalMessage(
  leadName: string,
  segment: string,
  projectType?: string,
): Promise<string> {
  const solutionMap: Record<string, string> = {
    'site-cardapio': 'site com cardápio digital e pedidos via WhatsApp',
    'site-agendamento': 'site com agendamento online integrado ao WhatsApp',
    'site-vitrine': 'site vitrine profissional com WhatsApp integrado',
    'site-ecommerce': 'catálogo digital com compras pelo WhatsApp',
    'site-servicos': 'site com orçamento rápido via WhatsApp',
    'social-conteudo': 'gestão de conteúdo automático para Instagram e Facebook',
    'social-campanha': 'campanhas sazonais + conteúdo orgânico para redes sociais',
    'social-completo': 'conteúdo diário + design + relatórios para redes sociais',
    'completo-presenca': 'site profissional + redes sociais gerenciadas + WhatsApp',
    'completo-vendas': 'e-commerce + Instagram Shop + WhatsApp Commerce',
  };
  const solutionDesc = solutionMap[projectType || ''] || 'presença digital completa com site + redes sociais + WhatsApp';

  const prompt = `Você é o Gabriel, um consultor de marketing digital. Crie uma mensagem CURTA e persuasiva para enviar 
via WhatsApp para o proprietário de "${leadName}" (segmento: ${segment}).

Você já criou um ${solutionDesc} personalizado para ele e vai enviar uma prévia em imagem.

A mensagem deve:
1. Se apresentar: "Aqui é o Gabriel"
2. Dizer que fez uma prévia EXCLUSIVA E GRATUITA de um ${solutionDesc} para o negócio dele
3. Falar que já enviou o print do projeto abaixo
4. Perguntar se ele gostou e se pode agendar uma call rápida
5. SER DIRETA e CONVERSACIONAL (como se estivesse falando com um amigo)
6. MÁXIMO 180 caracteres
7. NÃO usar emojis

Responda APENAS com a mensagem, sem aspas, sem markdown.`;

  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    const cleaned = content.replace(/[""]/g, '').trim();
    return cleaned || `Aqui é o Gabriel! Fiz uma prévia grátis de um ${solutionDesc} pro seu negócio. Olha o print abaixo — curtiu? Bora agendar uma call rápida?`;
  } catch {
    return `Aqui é o Gabriel! Fiz uma prévia grátis de um ${solutionDesc} pro seu negócio. Olha o print abaixo — curtiu? Bora agendar uma call rápida?`;
  }
}

/**
 * Converte um arquivo HTML em uma imagem PNG usando Playwright.
 */
async function htmlToPng(
  htmlPath: string,
  outputPng: string,
  width = 1280,
  height = 900,
): Promise<void> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2, // Retina para nitidez máxima
    });
    const page = await context.newPage();

    // Load the HTML file
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle',
      timeout: 20000,
    });

    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    // Full-page screenshot para capturar tudo
    await page.screenshot({ path: outputPng, type: 'png', fullPage: true });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Gera previews de posts para redes sociais (Instagram/Facebook).
 * Cria 2-3 amostras de posts como HTML e converte para PNG.
 *
 * @returns Array de caminhos absolutos dos PNGs gerados.
 */
async function generateSocialMediaPosts(
  leadId: string,
  leadName: string,
  segment: string,
): Promise<string[]> {
  const postsDir = path.join(WORKSPACE_ROOT, 'sites', 'leads', leadId, 'social');
  fs.mkdirSync(postsDir, { recursive: true });

  // Pede pra IA criar 3 ideias de posts
  const prompt = `Você é um social media designer. Crie 3 posts para Instagram para "${leadName}" (segmento: ${segment}).

Para CADA post, gere um HTML que pareça UM POST DO INSTAGRAM (mockup de feed):
- Proporção 1:1 (quadrado) — 600x600
- Fundo com gradiente ou cor sólida elegante
- Título chamativo em negrito
- Subtítulo ou descrição
- Ícone decorativo grande (use Unicode/emoji)
- Nome da marca no topo
- Layout moderno e limpo

Temas dos posts (um de cada):
1. Post de SERVIÇO: destaque um serviço principal
2. Post de PROMOÇÃO/OFERTA: algo atrativo
3. Post de ENGAJAMENTO: dica ou curiosidade sobre o segmento

Responda APENAS com um JSON array de objetos, cada um com:
{"html":"<html>...</html>","caption":"legenda curta para o post"}

O HTML deve ser um documento completo <html> com CSS inline.
Sem markdown, sem \`\`\`, APENAS o JSON.`;

  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    const cleaned = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
    const posts = JSON.parse(cleaned);
    const pngs: string[] = [];

    if (!Array.isArray(posts)) return pngs;

    for (let i = 0; i < Math.min(posts.length, 3); i++) {
      const post = posts[i];
      if (!post.html) continue;

      const htmlPath = path.join(postsDir, `post-${i + 1}.html`);
      fs.writeFileSync(htmlPath, post.html, 'utf-8');

      const pngPath = path.join(postsDir, `post-${i + 1}.png`);
      try {
        await htmlToPng(htmlPath, pngPath, 600, 600);
        pngs.push(pngPath);
        console.log(`[leads] Post #${i + 1} gerado para ${leadName}`);
      } catch (e) {
        console.error(`[leads] Erro ao gerar post #${i + 1}:`, e);
      }
    }

    return pngs;
  } catch {
    // Fallback: gera 3 posts genéricos
    const fallbacks = generateFallbackSocialPosts(leadName, segment);
    const pngs: string[] = [];
    for (let i = 0; i < fallbacks.length; i++) {
      const htmlPath = path.join(postsDir, `post-${i + 1}.html`);
      fs.writeFileSync(htmlPath, fallbacks[i], 'utf-8');
      const pngPath = path.join(postsDir, `post-${i + 1}.png`);
      try {
        await htmlToPng(htmlPath, pngPath, 600, 600);
        pngs.push(pngPath);
      } catch { /* ignore fallback errors */ }
    }
    return pngs;
  }
}

/**
 * Fallback para posts de redes sociais quando a IA falha.
 */
function generateFallbackSocialPosts(name: string, segment: string): string[] {
  const colors: Record<string, string> = {
    'Restaurante': '#e74c3c', 'Salão de Beleza': '#e91e63',
    'Oficina Mecânica': '#1565c0', 'Clínica': '#2e7d32',
    'Academia': '#ff6f00', 'Pet Shop': '#6a1b9a',
  };
  const color = colors[segment] || '#2563eb';

  const posts = [
    { title: 'Transforme seu Negócio', subtitle: 'Presença Digital Completa', icon: '🚀' },
    { title: 'Promoção Especial', subtitle: 'Consultoria Gratuita', icon: '🎯' },
    { title: 'Dica Rápida', subtitle: 'Marketing Digital para crescer', icon: '💡' },
  ];

  return posts.map((p) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',system-ui,sans-serif;width:600px;height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;
background:linear-gradient(135deg,${color} 0%,${color}cc 50%,${color}66 100%);color:#fff;text-align:center;padding:2rem;}
.brand{font-size:0.9rem;opacity:0.8;margin-bottom:2rem;letter-spacing:1px;}
.icon{font-size:4rem;margin-bottom:1.5rem;}
h1{font-size:2.2rem;font-weight:800;margin-bottom:0.8rem;text-shadow:0 2px 10px rgba(0,0,0,0.2);}
p{font-size:1.1rem;opacity:0.9;max-width:400px;line-height:1.4;}
.footer{position:absolute;bottom:2rem;font-size:0.75rem;opacity:0.6;}
</style></head><body>
<div class="brand">${name}</div>
<div class="icon">${p.icon}</div>
<h1>${p.title}</h1>
<p>${p.subtitle}</p>
<div class="footer">📱 (11) 99999-9999</div>
</body></html>`);
}

/**
 * Resultado da geração de sample para o lead.
 */
export interface SampleResult {
  /** Caminho do PNG principal (site/projeto) */
  mainPng: string;
  /** Caminhos dos PNGs de redes sociais (opcional) */
  socialPngs: string[];
  /** Tipo de projeto sugerido */
  projectType: string;
}

/**
 * Gera previews FODAS em PNG para o lead — site + redes sociais.
 *
 * A IA decide o tipo de solução ideal, gera o HTML do projeto,
 * gera posts de redes sociais, e converte tudo em PNGs.
 *
 * @returns SampleResult com caminhos dos PNGs gerados.
 */
export async function generateSampleSite(
  leadId: string,
  leadName: string,
  segment: string,
): Promise<SampleResult> {
  // 0) Descobrir o tipo de projeto ideal para esse lead
  const project = await suggestProjectType(leadName, segment);

  // 1) Gerar HTML do site/projeto principal
  const prompt = `Crie um HTML que demonstre uma solução digital IMPACTANTE e MODERNA para "${leadName}" (segmento: ${segment}).

TIPO DE PROJETO: ${project.title}
DESCRIÇÃO: ${project.description}
FUNCIONALIDADES: ${project.features.join(', ')}

REGRAS DE DESIGN (obrigatório):
- Layout moderno com gradientes, sombras suaves e cantos arredondados
- Paleta de cores premium que combine com o segmento (use cores escuras + cor de destaque)
- Tipografia elegante (Google Fonts: Inter ou Poppins)
- Hero section impactante com gradiente e CTA proeminente
- Ícones SVG ou Unicode para seções
- Botão flutuante do WhatsApp (verde, canto inferior direito)
- Card de depoimento ou estatística para passar credibilidade
- Footer com informações de contato

CONTEÚDO:
- Header com logo e navegação simples
- Hero: título impactante + subtítulo + botão CTA "Fale Conosco"
- Seção de funcionalidades/serviços (3-4 cards)
- Seção com preview/whatsapp ou agendamento
- Footer

NÚMERO DE WHATSAPP: (11) 99999-9999

Responda APENAS com o código HTML completo dentro de \`\`\`html ... \`\`\`
Use APENAS HTML + CSS (sem JavaScript).`;

  let html: string;
  try {
    const result = await executeCapability('ai.complete', {
      messages: [{ role: 'user', content: prompt }],
      model: process.env.AI_MODEL ?? 'big-pickle',
    }) as { outputs?: { content?: string } };

    const content = result?.outputs?.content ?? '';
    const match = content.match(/```html\s*([\s\S]*?)```/);
    html = match?.[1]?.trim() ?? generateFallbackSite(leadName, segment, project);
  } catch {
    html = generateFallbackSite(leadName, segment, project);
  }

  // 2) Salvar HTML do site
  const siteDir = path.join(WORKSPACE_ROOT, 'sites', 'leads', leadId);
  fs.mkdirSync(siteDir, { recursive: true });
  const htmlPath = path.join(siteDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // 3) Converter site HTML em PNG
  const pngPath = path.join(siteDir, 'preview.png');
  let mainPng = pngPath;
  try {
    await htmlToPng(htmlPath, pngPath, 1440, 900);
    mainPng = pngPath;
  } catch (e) {
    console.error('[leads] Falha ao gerar screenshot do site:', e);
  }

  // 4) Gerar posts de redes sociais
  let socialPngs: string[] = [];
  try {
    socialPngs = await generateSocialMediaPosts(leadId, leadName, segment);
    console.log(`[leads] ${socialPngs.length} posts de redes sociais gerados para ${leadName}`);
  } catch (e) {
    console.error(`[leads] Erro ao gerar posts sociais para ${leadName}:`, e);
  }

  return {
    mainPng,
    socialPngs,
    projectType: project.type,
  };
}

function generateFallbackSite(name: string, segment: string, project?: { title: string; description: string; features: string[] }): string {
  const colors: Record<string, { primary: string; accent: string; dark: string }> = {
    'Restaurante': { primary: '#e74c3c', accent: '#c0392b', dark: '#1a1a2e' },
    'Salão de Beleza': { primary: '#e91e63', accent: '#c2185b', dark: '#1a1a2e' },
    'Oficina Mecânica': { primary: '#1565c0', accent: '#0d47a1', dark: '#0d1b2a' },
    'Clínica': { primary: '#2e7d32', accent: '#1b5e20', dark: '#0d1b2a' },
    'Academia': { primary: '#ff6f00', accent: '#e65100', dark: '#1a1a2e' },
    'Pet Shop': { primary: '#6a1b9a', accent: '#4a148c', dark: '#1a1a2e' },
  };
  const c = colors[segment] ?? { primary: '#2563eb', accent: '#1d4ed8', dark: '#0f172a' };
  const p = project || { title: `${name} Digital`, description: 'Solução digital personalizada', features: ['Site moderno', 'WhatsApp integrado', 'Design responsivo', 'Alta performance'] };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — ${segment}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: ${c.dark}; color: #fff; overflow-x: hidden; }
    .hero { min-height: 80vh; background: linear-gradient(135deg, ${c.dark} 0%, ${c.accent}66 50%, ${c.primary}33 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 2rem; position: relative; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 30% 50%, ${c.primary}22 0%, transparent 60%); }
    .hero h1 { font-size: 3.5rem; font-weight: 800; background: linear-gradient(135deg, #fff 0%, ${c.primary}88 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 1rem; position: relative; }
    .hero p { font-size: 1.2rem; color: #94a3b8; max-width: 600px; margin-bottom: 2rem; position: relative; line-height: 1.6; }
    .hero .cta { display: inline-block; background: #25d366; color: #fff; padding: 1rem 2.5rem; border-radius: 50px; font-size: 1.1rem; font-weight: 600; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 20px #25d36644; position: relative; }
    .hero .cta:hover { transform: translateY(-2px); box-shadow: 0 6px 30px #25d36666; }
    .stats { display: flex; gap: 3rem; justify-content: center; padding: 3rem 2rem; background: ${c.dark}; border-top: 1px solid #ffffff11; }
    .stat { text-align: center; }
    .stat .num { font-size: 2rem; font-weight: 800; color: ${c.primary}; }
    .stat .label { color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 0.3rem; }
    .features { padding: 5rem 2rem; background: #0f172a; }
    .features h2 { text-align: center; font-size: 2rem; font-weight: 700; margin-bottom: 3rem; color: #f1f5f9; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 0 auto; }
    .card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 2rem; border-radius: 16px; border: 1px solid #ffffff11; text-align: center; transition: transform 0.2s, border-color 0.2s; }
    .card:hover { transform: translateY(-4px); border-color: ${c.primary}44; }
    .card .icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .card h4 { color: #f1f5f9; font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .card p { color: #64748b; font-size: 0.9rem; line-height: 1.5; }
    .footer { padding: 2rem; text-align: center; color: #475569; font-size: 0.85rem; border-top: 1px solid #ffffff11; }
    .whatsapp-float { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; background: #25d366; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px #25d36644; text-decoration: none; font-size: 30px; color: white; transition: transform 0.2s; z-index: 999; }
    .whatsapp-float:hover { transform: scale(1.1); }
  </style>
</head>
<body>
  <section class="hero">
    <h1>${p.title}</h1>
    <p>${p.description}</p>
    <a href="https://wa.me/5511999999999" target="_blank" class="cta">&#x1F4AC; Fale Conosco pelo WhatsApp</a>
  </section>

  <section class="stats">
    <div class="stat"><div class="num">+50</div><div class="label">Clientes Atendidos</div></div>
    <div class="stat"><div class="num">98%</div><div class="label">Satisfação</div></div>
    <div class="stat"><div class="num">24h</div><div class="label">Suporte</div></div>
  </section>

  <section class="features">
    <h2>O que oferecemos</h2>
    <div class="grid">
      ${p.features.map((f, i) => `<div class="card"><div class="icon">${['🚀','💬','🎨','⚡'][i]||'✨'}</div><h4>${f}</h4><p>Solução profissional projetada especialmente para ${name}.</p></div>`).join('')}
    </div>
  </section>

  <footer class="footer">
    <p>&copy; 2026 ${name} — Solução Digital por Gabriel. Todos os direitos reservados.</p>
  </footer>

  <a href="https://wa.me/5511999999999" target="_blank" class="whatsapp-float" title="Fale conosco">&#x1F4AC;</a>
</body>
</html>`;
}
