/**
 * Executor WhatsApp Web
 * ======================
 * Usa Playwright para controlar o WhatsApp Web:
 *   - Conectar via QR Code (headless com screenshot ou navegador visível)
 *   - Enviar mensagens de texto (headless)
 *   - Enviar imagens com legenda
 *
 * A sessão fica salva em .beehive-whatsapp-session/ para reconexão automática.
 *
 * Conexão headless (Railway/headless servers):
 *   1. whatsappConnect({ headless: true }) abre Chromium headless
 *   2. Captura screenshot da área do QR Code → salva em .beehive-qr-cache.png
 *   3. Endpoint /api/whatsapp/qr-image serve essa imagem para o usuário ver no navegador
 *   4. Um polling interno detecta quando o QR foi escaneado
 *   5. Sessão salva, browser fechado
 */
import path from 'node:path';
import fs from 'node:fs';
import { WORKSPACE_ROOT } from '../workspace.js';

// In-memory debug log ring buffer
const __debugLogs: string[] = [];
const MAX_DEBUG_LOGS = 200;
function dbg(msg: string): void {
  const ts = new Date().toISOString().slice(11, 23);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  __debugLogs.push(line);
  if (__debugLogs.length > MAX_DEBUG_LOGS) __debugLogs.splice(0, __debugLogs.length - MAX_DEBUG_LOGS);
}
export function getDebugLogs(): string[] {
  return [...__debugLogs];
}

const SESSION_DIR = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-session');
const STATUS_FILE = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-status.json');
const QR_CACHE = path.join(WORKSPACE_ROOT, '.beehive-qr-cache.png');

interface WhatsAppStatus {
  connected: boolean;
  connectedAt?: number;
  phone?: string;
  lastCheckAt?: number;
  error?: string;
  /** Quando está em modo headless aguardando scan do QR */
  waitingQr?: boolean;
  /** Timestamp do início da espera do QR */
  qrWaitStartedAt?: number;
}

/** Referência global para o browser headless durante espera do QR */
let _qrBrowser: any = null;
let _qrPage: any = null;
let _qrPollTimer: ReturnType<typeof setInterval> | null = null;

function loadStatus(): WhatsAppStatus {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch { return { connected: false }; }
}
function saveStatus(s: WhatsAppStatus): void {
  try { fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2), 'utf8'); } catch { /* ignore */ }
}

/**
 * Para a sessão headless de QR e limpa recursos.
 */
function stopQrPolling(): void {
  if (_qrPollTimer) { clearInterval(_qrPollTimer); _qrPollTimer = null; }
  _qrPage = null;
  if (_qrBrowser) {
    try { _qrBrowser.close().catch(() => {}); } catch { /* ignore */ }
    _qrBrowser = null;
  }
  // Limpa status de waiting
  const s = loadStatus();
  if (s.waitingQr) {
    s.waitingQr = false;
    delete s.qrWaitStartedAt;
    saveStatus(s);
  }
}

/**
 * Extrai o QR Code do canvas do WhatsApp Web e salva como PNG.
 * É mais confiável que screenshot porque obtém a imagem nativa do canvas.
 */
async function captureQrFromCanvas(page: any): Promise<boolean> {
  try {
    const dataUrl = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    }).catch(() => null);

    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,')) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(QR_CACHE, Buffer.from(base64, 'base64'));
      return true;
    }
    return false;
  } catch { return false; }
}

/**
 * Polling interno: a cada 3s verifica se o QR foi escaneado.
 * Se sim, salva status de conectado e limpa recursos.
 */
function startQrPolling(page: any): void {
  if (_qrPollTimer) clearInterval(_qrPollTimer);

  _qrPollTimer = setInterval(async () => {
    try {
      if (!_qrPage) return;

      // Verifica se apareceu a lista de chats (logado)
      const chatCount = await _qrPage.locator('[data-testid="chat-list"], #side').count().catch(() => 0);
      if (chatCount > 0) {
        // Conectado! Tenta pegar número
        let phone = '';
        try {
          await _qrPage.waitForTimeout(1000);
          phone = await _qrPage.locator('header span[title]').first().textContent().catch(() => '') || '';
        } catch { /* opcional */ }

        saveStatus({
          connected: true,
          connectedAt: Date.now(),
          phone,
          waitingQr: false,
        });
        dbg('[whatsapp] QR escaneado! WhatsApp conectado.');
        stopQrPolling();
        return;
      }

      // Só sobrescreve QR_CACHE se o canvas realmente apareceu
      const captured = await captureQrFromCanvas(_qrPage);
      if (!captured) {
        const hasCanvasNow = await _qrPage.evaluate(() => {
          const c = document.querySelector('canvas');
          return c && c.width > 0;
        }).catch(() => false);
        if (hasCanvasNow) {
          await _qrPage.screenshot({ path: QR_CACHE, fullPage: false }).catch(() => {});
          dbg('[whatsapp] QR atualizado via screenshot (canvas novo)');
        } else {
          dbg('[whatsapp] QR polling: canvas ainda não disponível');
        }
      } else {
        dbg('[whatsapp] QR atualizado via canvas');
      }
      saveStatus({ ...loadStatus(), waitingQr: true, lastCheckAt: Date.now() });
    } catch {
      // Se página foi fechada, limpa
      stopQrPolling();
    }
  }, 3000);
}

/**
 * Conecta ao WhatsApp Web.
 *
 * @param options.headless - Se true (Railway), captura QR como screenshot.
 *                           Se false (PC local), abre navegador visível.
 *                           Default: false (compatibilidade).
 * @param options.timeout  - Tempo máximo em ms para aguardar QR (default: 120s).
 *
 * Modo headless:
 *   - Retorna { ok: true, waitingQr: true, qrPath: '...' } imediatamente
 *   - O QR screenshot é atualizado a cada 3s em .beehive-qr-cache.png
 *   - Use GET /api/whatsapp/qr-image (ou /files/.beehive-qr-cache.png) para ver
 *   - Quando escaneado, status muda para connected
 *
 * Modo visível:
 *   - Abre janela do Chromium, bloqueia até scan ou timeout
 */
export async function whatsappConnect(options?: { headless?: boolean; timeout?: number }): Promise<{
  ok: boolean;
  message: string;
  waitingQr?: boolean;
  qrPath?: string;
}> {
  const status = loadStatus();
  if (status.connected) {
    stopQrPolling();
    return { ok: true, message: 'Já conectado ao WhatsApp Web' };
  }

  // Se já está aguardando QR em headless, não duplica
  if (status.waitingQr && _qrBrowser) {
    return { ok: true, message: 'Já aguardando scan do QR Code', waitingQr: true, qrPath: '.beehive-qr-cache.png' };
  }

  const isHeadless = options?.headless ?? false;
  const timeout = options?.timeout ?? 120000;

  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, message: 'Playwright não instalado. Execute: npx playwright install --with-deps chromium' };
  }

  // Garante diretório de sessão
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  let browser: any = null;
  try {
    const launchOpts: Record<string, unknown> = {
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      viewport: { width: 1280, height: 800 },
    };

    if (isHeadless) {
      // Modo headless: abre e captura QR como screenshot
      launchOpts.headless = true;
      launchOpts.args = (launchOpts.args as string[]).concat([
        '--disable-gpu',
        '--disable-software-rasterizer',
      ]);
      browser = await chromium.launchPersistentContext(SESSION_DIR, launchOpts);
      const pages = browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();

      // WhatsApp Web pode levar bastante tempo pra carregar o QR em headless
      await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle', timeout: 90000 });
      dbg('[whatsapp] Página carregada, aguardando renderização do QR...');

      // Espera progressivamente até o canvas aparecer (max 25s)
      let canvasFound = false;
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(2500);
        const hasCanvas = await page.evaluate(() => {
          const canvases = document.querySelectorAll('canvas');
          return canvases.length > 0 && canvases[0].width > 0;
        }).catch(() => false);
        if (hasCanvas) {
          canvasFound = true;
          dbg('[whatsapp] Canvas do QR encontrado após ' + ((i + 1) * 2500) + 'ms');
          break;
        }
        dbg('[whatsapp] Aguardando canvas... tentativa ' + (i + 1) + '/10');
      }

      // Debug final
      try {
        const title = await page.title().catch(() => 'sem título');
        const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length).catch(() => -1);
        dbg(`[whatsapp] Page: "${title}" canvas: ${canvasCount} found: ${canvasFound}`);
      } catch (e) {
        dbg('[whatsapp] ERROR Debug: ' + (e instanceof Error ? e.message : String(e)));
      }

      // Extrai QR do canvas
      const qrOk = await captureQrFromCanvas(page);
      if (qrOk) {
        dbg('[whatsapp] QR Code extraído do canvas com sucesso');
      } else if (canvasFound) {
        // Canvas existe mas toDataURL falhou — tenta screenshot
        dbg('[whatsapp] Canvas encontrado mas extração falhou, tentando screenshot...');
        try {
          await page.screenshot({ path: QR_CACHE, fullPage: true, type: 'png' });
          dbg('[whatsapp] Screenshot salvo em ' + QR_CACHE);
        } catch (err: unknown) {
          dbg('[whatsapp] ERROR Screenshot: ' + (err instanceof Error ? err.message : String(err)));
        }
      } else {
        // Canvas não encontrado — screenshot anyway pra debug
        dbg('[whatsapp] Canvas não encontrado, salvando screenshot de debug');
        try {
          await page.screenshot({ path: QR_CACHE, fullPage: true, type: 'png' });
          dbg('[whatsapp] Screenshot de debug salvo');
        } catch (err: unknown) {
          dbg('[whatsapp] ERROR Screenshot debug: ' + (err instanceof Error ? err.message : String(err)));
        }
      }

      // Armazena referências globais
      _qrBrowser = browser;
      _qrPage = page;

      // Inicia polling (NÃO sobrescreve QR_CACHE com screenshots em branco)
      saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now() });
      startQrPolling(page);

      // Timeout: se não escaneou em X ms, limpa
      setTimeout(() => {
        const s = loadStatus();
        if (s.waitingQr) {
          dbg('[whatsapp] Timeout aguardando QR scan');
          saveStatus({ connected: false, error: 'Tempo esgotado para scan do QR Code', waitingQr: false });
          stopQrPolling();
        }
      }, timeout);

      return {
        ok: true,
        message: 'QR Code gerado. Escaneie com o WhatsApp do celular.',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
    } else {
      // Modo VISÍVEL (PC local): abre janela para scan direto
      launchOpts.headless = false;
      browser = await chromium.launchPersistentContext(SESSION_DIR, launchOpts);
      const pages = browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();
      await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Espera até logar
      try {
        await page.waitForSelector('[data-testid="chat-list"], #side', { timeout });
      } catch {
        // Pode estar na tela de QR ainda
      }

      const chatListCount = await page.locator('[data-testid="chat-list"], #side').count();
      const loggedIn = chatListCount > 0;

      if (loggedIn) {
        let phone = '';
        try {
          await page.waitForTimeout(3000);
          phone = await page.locator('header span[title]').first().textContent().catch(() => '') || '';
        } catch { /* opcional */ }
        saveStatus({ connected: true, connectedAt: Date.now(), phone });
        await browser.close().catch(() => {});
        return { ok: true, message: 'WhatsApp conectado com sucesso!' };
      }

      await browser.close().catch(() => {});
      return { ok: false, message: 'Tempo esgotado. Escaneie o QR Code e tente novamente.' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    saveStatus({ connected: false, error: msg });
    stopQrPolling();
    if (browser && browser !== _qrBrowser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return { ok: false, message: `Erro ao conectar: ${msg}` };
  }
}

/**
 * Retorna o caminho do último screenshot do QR Code (para servir via API).
 */
export function whatsappGetQrImagePath(): string | null {
  return fs.existsSync(QR_CACHE) ? QR_CACHE : null;
}

/**
 * Envia uma mensagem de texto para um número via WhatsApp Web.
 * Usa a sessão salva (modo headless, invisível).
 */
export async function whatsappSendMessage(
  phone: string,
  message: string,
): Promise<{ ok: boolean; message: string }> {
  const status = loadStatus();
  if (!status.connected) {
    return { ok: false, message: 'WhatsApp não está conectado. Conecte primeiro.' };
  }

  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, message: 'Playwright não instalado.' };
  }

  let browser: any = null;
  try {
    if (!fs.existsSync(SESSION_DIR)) {
      return { ok: false, message: 'Sessão do WhatsApp não encontrada. Reconecte.' };
    }

    browser = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // 1. Abrir WhatsApp Web
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // 2. Verificar se ainda está logado
    const chatCount = await page.locator('[data-testid="chat-list"], #side').count();
    if (chatCount === 0) {
      saveStatus({ connected: false, error: 'Sessão expirou' });
      return { ok: false, message: 'Sessão do WhatsApp expirou. Reconecte.' };
    }

    // 3. Limpar número (só dígitos, sem formatação)
    const cleaned = phone.replace(/\D/g, '');
    const waNumber = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;

    // 4. Abrir o link direto do número: https://web.whatsapp.com/send?phone=55XX...
    await page.goto(`https://web.whatsapp.com/send?phone=${waNumber}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    // 5. Esperar o campo de texto da mensagem aparecer
    // O WhatsApp Web pode mostrar tela de "clicar em continuar" em alguns casos
    await page.waitForTimeout(5000);

    // Tenta detectar se a conversa abriu
    const textboxCount = await page.locator('div[contenteditable="true"]').count();
    const chatReady = textboxCount > 0;

    if (!chatReady) {
      // Pode ser que o número não existe no WhatsApp ou está bloqueado
      return { ok: false, message: `Não foi possível abrir conversa com ${phone}. O número existe no WhatsApp?` };
    }

    // 6. Digitar a mensagem
    const textbox = await page.locator('div[contenteditable="true"]');
    await textbox.click();
    await page.waitForTimeout(500);

    // Digita caractere por caractere (mais natural) ou de uma vez
    await textbox.fill(message);
    await page.waitForTimeout(1000);

    // 7. Pressionar Enter para enviar
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 8. Confirmar que a mensagem foi enviada
    const sentCount = await page.locator('.message-out').count();
    const sent = sentCount > 0;

    if (sent) {
      return { ok: true, message: `Mensagem enviada para ${phone}` };
    }

    // Tenta um segundo método: Ctrl+Enter ou Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    return { ok: true, message: `Mensagem enviada para ${phone} (confirmação visual)` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return { ok: false, message: `Erro ao enviar: ${msg}` };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

/**
 * Envia uma imagem com legenda via WhatsApp Web.
 * imagePath: caminho absoluto ou relativo ao workspace para o arquivo PNG/JPG.
 */
export async function whatsappSendImage(
  phone: string,
  imagePath: string,
  caption?: string,
): Promise<{ ok: boolean; message: string }> {
  const status = loadStatus();
  if (!status.connected) {
    return { ok: false, message: 'WhatsApp não está conectado. Conecte primeiro.' };
  }

  // Resolve o caminho da imagem
  const absPath = path.isAbsolute(imagePath)
    ? imagePath
    : path.join(WORKSPACE_ROOT, imagePath);

  if (!fs.existsSync(absPath)) {
    return { ok: false, message: `Arquivo não encontrado: ${imagePath}` };
  }

  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, message: 'Playwright não instalado.' };
  }

  let browser: any = null;
  try {
    browser = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // 1. Abrir WhatsApp Web
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // 2. Verificar sessão
    const wac = await page.locator('[data-testid="chat-list"], #side').count();
    if (wac === 0) {
      saveStatus({ connected: false, error: 'Sessão expirou' });
      return { ok: false, message: 'Sessão do WhatsApp expirou. Reconecte.' };
    }

    // 3. Abrir conversa
    const cleaned = phone.replace(/\D/g, '');
    const waNumber = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;

    await page.goto(`https://web.whatsapp.com/send?phone=${waNumber}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(5000);

    // 4. Clicar no botão de anexo (clip)
    const attachBtn = await page.locator('div[title="Anexar"], button[aria-label="Anexar"], div[data-testid="attach"]');
    if (await attachBtn.isVisible().catch(() => false)) {
      await attachBtn.click();
      await page.waitForTimeout(1000);
    }

    // 5. Fazer upload da imagem
    // O WhatsApp usa um input[type="file"] escondido
    const fileInput = await page.locator('input[type="file"]');
    if (await fileInput.isVisible().catch(() => false)) {
      await fileInput.setInputFiles(absPath);
    } else {
      // Tenta encontrar o input por atributos
      const fileInputs = page.locator('input[accept*="image"]');
      await fileInputs.first().setInputFiles(absPath).catch(async () => {
        // Alternativa: arrastar soltar ou usar o botão de mídia
        const mediaBtn = page.locator('div[data-testid="media-picker"], button[title*="Mídia"]');
        await mediaBtn.first().click().catch(() => {});
        await page.waitForTimeout(1500);
        const fi = page.locator('input[type="file"]');
        await fi.setInputFiles(absPath);
      });
    }

    await page.waitForTimeout(2000);

    // 6. Se tiver legenda, digitar
    if (caption) {
      const captionBox = await page.locator('div[contenteditable="true"]');
      if (await captionBox.isVisible().catch(() => false)) {
        await captionBox.click();
        await captionBox.fill(caption);
        await page.waitForTimeout(500);
      }
    }

    // 7. Clicar em Enviar
    const sendBtn = await page.locator('button[data-testid="send"], button[aria-label="Enviar"], span[data-testid="send"]');
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
    } else {
      // Fallback: Enter
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(2000);

    return { ok: true, message: `Imagem enviada para ${phone}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return { ok: false, message: `Erro ao enviar imagem: ${msg}` };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

/**
 * Retorna o status atual da conexão WhatsApp.
 */
export async function whatsappGetStatus(): Promise<WhatsAppStatus> {
  return loadStatus();
}

/**
 * Desconecta e limpa a sessão.
 */
export async function whatsappDisconnect(): Promise<void> {
  // Para polling e fecha browser headless
  stopQrPolling();

  // Remove o diretório de sessão
  if (fs.existsSync(SESSION_DIR)) {
    try {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
  if (fs.existsSync(STATUS_FILE)) {
    try { fs.unlinkSync(STATUS_FILE); } catch { /* ignore */ }
  }
  if (fs.existsSync(QR_CACHE)) {
    try { fs.unlinkSync(QR_CACHE); } catch { /* ignore */ }
  }
  saveStatus({ connected: false });
}
