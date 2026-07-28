/**
 * Instagram Crawler — usa Playwright para extrair posts de um perfil público.
 *
 * Estratégia:
 *   1. Navega até o perfil do Instagram (sem login)
 *   2. Tenta extrair dados do JSON embutido no HTML (window.__INITIAL_STATE__)
 *   3. Se falhar, faz scroll e extrai links/posts do DOM renderizado
 *   4. Abre cada post para capturar legenda e URL da mídia
 *   5. Retorna estrutura limpa para download
 */
import { chromium, Browser } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { debugLog } from '../debug-log.js';
import { WORKSPACE_ROOT } from '../workspace.js';

// page.evaluate() roda no browser — typed any para evitar TS errors
// sem precisar incluir 'dom' no tsconfig.json do worker
declare const document: any;
declare const window: any;

// ── Types ───────────────────────────────────────────────────────

export interface InstagramMedia {
  /** URL absoluta da mídia (foto ou vídeo) */
  url: string;
  /** 'image' | 'video' */
  type: 'image' | 'video';
  /** Nome do arquivo para salvar (ex: '01-photo.jpg') */
  filename: string;
}

export interface InstagramPost {
  /** Código curto do post (ex: 'CxYzAbCdEfG') */
  shortcode: string;
  /** Legenda / descrição do post */
  caption: string;
  /** Mídias do post (1 para foto/vídeo, múltiplas para carrossel) */
  media: InstagramMedia[];
  /** Timestamp do post (ms) */
  timestamp: number;
  /** Número de curtidas (se disponível) */
  likes?: number;
  /** Número de comentários (se disponível) */
  comments?: number;
}

export interface InstagramProfile {
  /** Nome de usuário */
  username: string;
  /** Nome completo */
  fullName: string;
  /** Biografia */
  biography: string;
  /** Seguidores */
  followers: number;
  /** Seguindo */
  following: number;
  /** Total de posts */
  postsCount: number;
  /** URL da foto do perfil */
  profilePicUrl: string;
  /** Posts extraídos */
  posts: InstagramPost[];
}

export interface CrawlResult {
  profile: InstagramProfile;
  /** Diretório onde os downloads foram salvos */
  downloadDir: string;
  /** Quantidade de mídias baixadas */
  mediaDownloaded: number;
  /** Caminho do arquivo .md de legendas */
  captionsFilePath: string;
  /** Erros durante o processo */
  errors: string[];
}

export interface CrawlRequest {
  /** URL ou username do Instagram */
  profileUrl: string;
  /** Diretório de saída (opcional — padrão: downloads/instagram/<username>) */
  outputDir?: string;
  /** Máximo de posts para extrair (0 = todos) */
  maxPosts?: number;
  /** Headless mode */
  headless?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extrai o username de uma URL ou string */
function extractUsername(input: string): string {
  let clean = input.trim();
  // Remove protocolo e domínio
  clean = clean.replace(/^https?:\/\/(www\.)?instagram\.com\//, '');
  // Remove barras no final e query params
  clean = clean.split('/')[0].split('?')[0];
  return clean.replace(/[^a-zA-Z0-9_.]/g, '');
}

/** Gera nome de arquivo seguro */
function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100);
}

/** Download de arquivo via HTTP/HTTPS */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const handler = (res: import('http').IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Segue redirect
        file.close();
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${res.statusCode} ao baixar ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    };
    proto.get(url, handler).on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/** Pega extensão do arquivo pela URL */
function extFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const ext = path.extname(clean).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.mp4'].includes(ext)) return ext;
  // Fallback por padrão
  if (url.includes('/video/') || url.includes('.mp4')) return '.mp4';
  return '.jpg';
}

// ── Main Crawler ────────────────────────────────────────────────

export async function crawlInstagram(req: CrawlRequest): Promise<CrawlResult> {
  const username = extractUsername(req.profileUrl);
  const maxPosts = req.maxPosts || 0; // 0 = todos
  const errors: string[] = [];

  if (!username) {
    throw new Error(`Não foi possível extrair o username de: "${req.profileUrl}"`);
  }

  // Define diretório de saída
  const outputDir = req.outputDir
    ? path.resolve(req.outputDir, safeFilename(username))
    : path.join(WORKSPACE_ROOT, 'downloads', 'instagram', safeFilename(username));

  const photosDir = path.join(outputDir, 'photos');
  const videosDir = path.join(outputDir, 'videos');
  fs.mkdirSync(photosDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  debugLog(`[instagram] Iniciando crawl de "${username}" → ${outputDir}`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: req.headless !== false,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // ── 1. Navega para o perfil ──
    const profileUrl = `https://www.instagram.com/${username}/`;
    debugLog(`[instagram] Navegando para ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      // Timeout é normal — Instagram carrega conteúdo assíncrono
      debugLog('[instagram] Timeout no networkidle, continuando...');
    });
    await sleep(3000);

    // ── 2. Tenta extrair dados do JSON embutido ──
    let posts: InstagramPost[] = [];
    let profile: Partial<InstagramProfile> = { username };

    // Método A: window.__INITIAL_STATE__ (funciona em alguns cenários)
    try {
      const initialData = await page.evaluate(() => {
        const script = document.querySelector('script[type="text/javascript"]');
        if (!script?.textContent) return null;
        const match = script.textContent.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
        return match ? JSON.parse(match[1]) : null;
      });

      if (initialData?.items?.edges) {
        debugLog('[instagram] Dados extraídos via __INITIAL_STATE__');
        const edges = initialData.items.edges.slice(0, maxPosts || undefined);
        for (const edge of edges) {
          const node = edge.node || edge;
          const shortcode = node.shortcode || '';
          if (!shortcode) continue;
          const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || node.accessibility_caption || '';

          const media: InstagramMedia[] = [];
          if (node.display_url) {
            media.push({
              url: node.display_url,
              type: 'image',
              filename: `${shortcode}-photo.jpg`,
            });
          }
          if (node.is_video && node.video_url) {
            media.push({
              url: node.video_url,
              type: 'video',
              filename: `${shortcode}-video.mp4`,
            });
          }
          // Carrossel
          if (node.edge_sidecar_to_children?.edges) {
            for (const child of node.edge_sidecar_to_children.edges) {
              const cn = child.node || child;
              const idx = media.length + 1;
              if (cn.is_video && cn.video_url) {
                media.push({ url: cn.video_url, type: 'video', filename: `${shortcode}-${idx}.mp4` });
              } else if (cn.display_url) {
                media.push({ url: cn.display_url, type: 'image', filename: `${shortcode}-${idx}.jpg` });
              }
            }
          }

          posts.push({
            shortcode,
            caption,
            media,
            timestamp: (node.taken_at_timestamp || Date.now()) * 1000,
            likes: node.edge_media_preview_like?.count || undefined,
            comments: node.edge_media_to_comment?.count || undefined,
          });
        }
      }
    } catch (e) {
      debugLog(`[instagram] __INITIAL_STATE__ falhou: ${e instanceof Error ? e.message : 'erro'}`);
    }

    // Método B: Se não conseguiu posts pelo JSON, tenta pelo DOM
    if (posts.length === 0) {
      debugLog('[instagram] Tentando extração via DOM...');

      // Faz scroll várias vezes para carregar mais posts
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(2000);
      }

      // Extrai links de posts do DOM
      const postLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll('a[href*="/p/"]').forEach((a: any) => {
          const href = a.href;
          if (href && !links.includes(href)) links.push(href);
        });
        return links;
      });

      debugLog(`[instagram] Encontrados ${postLinks.length} links de posts via DOM`);

      // Visita cada post para extrair dados
      const limit = maxPosts > 0 ? Math.min(postLinks.length, maxPosts) : postLinks.length;
      for (let i = 0; i < limit; i++) {
        try {
          await page.goto(postLinks[i], { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
          await sleep(2000);

          const postData = await page.evaluate(() => {
            // Tenta extrair metadados do post do DOM
            const img: any = document.querySelector('img[src*="cdninstagram"]');
            const video: any = document.querySelector('video source');
            const captionEl = document.querySelector('h1') || document.querySelector('[data-lexical-text="true"]');
            const shortcodeMatch = window.location.pathname.match(/\/p\/([^/]+)/);

            return {
              shortcode: shortcodeMatch?.[1] || '',
              imageUrl: img?.src || '',
              videoUrl: video?.src || '',
              caption: captionEl?.textContent || '',
            };
          });

          if (postData.shortcode) {
            const media: InstagramMedia[] = [];
            if (postData.imageUrl) {
              media.push({ url: postData.imageUrl, type: 'image', filename: `${postData.shortcode}.jpg` });
            }
            if (postData.videoUrl) {
              media.push({ url: postData.videoUrl, type: 'video', filename: `${postData.shortcode}.mp4` });
            }
            posts.push({
              shortcode: postData.shortcode,
              caption: postData.caption,
              media,
              timestamp: Date.now(),
            });
          }
        } catch (e) {
          errors.push(`Post #${i + 1}: ${e instanceof Error ? e.message : 'erro'}`);
        }
      }
    }

    // ── 3. Extrai dados do perfil (se disponível) ──
    try {
      const profileData = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]');
        const desc = metaDesc?.getAttribute('content') || '';
        const title = document.title || '';
        const profilePic: any = document.querySelector('img[alt*="profile"]');
        const profilePicSrc = profilePic?.src || '';
        return { description: desc, title, profilePic };
      });

      // Parse da description do Instagram: "N followers, N following, N posts - See Instagram photos and videos from NAME (@user)"
      const descParts = profileData.description.split(' - ');
      profile.biography = descParts[1] || '';
      profile.profilePicUrl = profileData.profilePic;
      profile.fullName = profileData.title.replace(` (@${username}) • Instagram photos and videos`, '').trim();
    } catch (e) {
      debugLog(`[instagram] Erro ao extrair dados do perfil: ${e}`);
    }

    // ── 4. Download das mídias ──
    let mediaDownloaded = 0;
    const allMedia: { url: string; destPath: string }[] = [];

    for (const post of posts) {
      for (const m of post.media) {
        const destDir = m.type === 'video' ? videosDir : photosDir;
        allMedia.push({ url: m.url, destPath: path.join(destDir, m.filename) });
      }
    }

    // Download em paralelo (máx 3 simultâneos)
    const concurrency = 3;
    for (let i = 0; i < allMedia.length; i += concurrency) {
      const batch = allMedia.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((item) => downloadFile(item.url, item.destPath)
          .then(() => { mediaDownloaded++; })
          .catch((err) => {
            errors.push(`Download ${item.url}: ${err.message}`);
          }),
        ),
      );
      // Log de progresso
      for (const r of results) {
        if (r.status === 'rejected') {
          errors.push(`Erro inesperado no download: ${r.reason}`);
        }
      }
    }

    debugLog(`[instagram] Mídias baixadas: ${mediaDownloaded}/${allMedia.length}`);

    // ── 5. Cria arquivo .md com legendas ──
    const captionsMd = generateCaptionsMarkdown(posts, profile, username);
    const captionsFilePath = path.join(outputDir, 'captions.md');
    fs.writeFileSync(captionsFilePath, captionsMd, 'utf-8');

    debugLog(`[instagram] Legendas salvas em ${captionsFilePath}`);

    return {
      profile: {
        username,
        fullName: profile.fullName || username,
        biography: profile.biography || '',
        followers: profile.followers || 0,
        following: profile.following || 0,
        postsCount: profile.postsCount || posts.length,
        profilePicUrl: profile.profilePicUrl || '',
        posts,
      },
      downloadDir: outputDir,
      mediaDownloaded,
      captionsFilePath,
      errors,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ── Markdown Generator ──────────────────────────────────────────

function generateCaptionsMarkdown(
  posts: InstagramPost[],
  profile: Partial<InstagramProfile>,
  username: string,
): string {
  const lines: string[] = [];
  lines.push(`# Instagram — @${username}\n`);
  if (profile.fullName) lines.push(`**${profile.fullName}**  `);
  if (profile.biography) lines.push(`> ${profile.biography}  `);
  lines.push('');
  if (profile.followers) lines.push(`- **${profile.followers.toLocaleString()}** seguidores`);
  if (profile.following) lines.push(`- **${profile.following.toLocaleString()}** seguindo`);
  lines.push(`- **${posts.length}** posts extraídos`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const dateStr = post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR') : 'data desconhecida';
    lines.push(`## Post #${i + 1} — ${post.shortcode}`);
    lines.push('');
    lines.push(`📅 ${dateStr}`);
    if (post.likes !== undefined) lines.push(`❤️ ${post.likes} curtidas`);
    if (post.comments !== undefined) lines.push(`💬 ${post.comments} comentários`);
    lines.push('');

    // Mídias
    if (post.media.length > 0) {
      lines.push('### 📎 Mídias');
      lines.push('');
      for (const m of post.media) {
        const icon = m.type === 'video' ? '🎬' : '🖼️';
        lines.push(`- ${icon} \`${m.filename}\``);
      }
      lines.push('');
    }

    // Legenda
    if (post.caption) {
      lines.push('### 📝 Legenda');
      lines.push('');
      lines.push(post.caption);
      lines.push('');
    } else {
      lines.push('*(sem legenda)*');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
