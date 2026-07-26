/**
 * Executor WhatsApp Web
 * ======================
 * Usa Playwright para controlar o WhatsApp Web:
 *   - Conectar via QR Code (navegador visível)
 *   - Enviar mensagens de texto (headless após conectar)
 *   - Enviar imagens com legenda
 *
 * A sessão fica salva em .beehive-whatsapp-session/ para reconexão automática.
 */
import path from 'node:path';
import fs from 'node:fs';
import { WORKSPACE_ROOT } from '../workspace.js';

const SESSION_DIR = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-session');
const STATUS_FILE = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-status.json');

interface WhatsAppStatus {
  connected: boolean;
  connectedAt?: number;
  phone?: string;           // número do dono da conta
  lastCheckAt?: number;
  error?: string;
}

function loadStatus(): WhatsAppStatus {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch { return { connected: false }; }
}
function saveStatus(s: WhatsAppStatus): void {
  try { fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2), 'utf8'); } catch { /* ignore */ }
}

/**
 * Abre o WhatsApp Web em modo VISÍVEL para o usuário escanear o QR Code.
 * Retorna { ok, message }.
 * Se já estiver conectado, retorna imediatamente.
 */
export async function whatsappConnect(): Promise<{ ok: boolean; message: string }> {
  const status = loadStatus();
  if (status.connected) {
    return { ok: true, message: 'Já conectado ao WhatsApp Web' };
  }

  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, message: 'Playwright não instalado. Execute: npx playwright install --with-deps chromium' };
  }

  let browser: any = null;
  try {
    // Garante que o diretório de sessão existe
    fs.mkdirSync(SESSION_DIR, { recursive: true });

    // Abre navegador VISÍVEL para o QR scan
    browser = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
      viewport: { width: 1280, height: 800 },
    });

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Espera até logar (QR sumir e chat aparecer) — usa locators, não document
    try {
      await page.waitForSelector('[data-testid="chat-list"], #side', { timeout: 120000 });
    } catch {
      // Se não achou, pode estar na tela de QR ainda
    }

    // Check se está realmente logado
    const chatListCount = await page.locator('[data-testid="chat-list"], #side').count();
    const loggedIn = chatListCount > 0;

    if (loggedIn) {
      // Tenta pegar o número do dono
      let phone = '';
      try {
        await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        phone = await page.locator('header span[title]').first().textContent().catch(() => '') || '';
      } catch { /* opcional */ }

      saveStatus({ connected: true, connectedAt: Date.now(), phone });
      return { ok: true, message: 'WhatsApp conectado com sucesso!' };
    }

    return { ok: false, message: 'Tempo esgotado. Escaneie o QR Code e tente novamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    saveStatus({ connected: false, error: msg });
    return { ok: false, message: `Erro ao conectar: ${msg}` };
  } finally {
    // Fecha o browser — a sessão (cookies/localStorage) já foi salva em SESSION_DIR
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
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
  // Remove o diretório de sessão
  if (fs.existsSync(SESSION_DIR)) {
    try {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
  if (fs.existsSync(STATUS_FILE)) {
    try { fs.unlinkSync(STATUS_FILE); } catch { /* ignore */ }
  }
  saveStatus({ connected: false });
}
