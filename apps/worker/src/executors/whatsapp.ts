/**
 * Executor WhatsApp Web
 * ======================
 * Usa whatsapp-web.js + Puppeteer para conectar via QR Code e enviar mensagens.
 * O whatsapp-web.js já lida com evasão de detecção, sessão persistente, etc.
 *
 * Fluxo headless (Railway):
 *   1. whatsappConnect({ headless: true }) → cria Client do whatsapp-web.js
 *   2. Evento 'qr' → salva QR Code como PNG em .beehive-qr-cache.png
 *   3. GET /api/whatsapp/qr-image → serve o PNG pro frontend
 *   4. Evento 'ready' → WhatsApp conectado, sessão salva em .beehive-whatsapp-session/
 *   5. Envio de mensagens usa o Client autenticado
 */
import path from 'node:path';
import fs from 'node:fs';
import QRCode from 'qrcode';
import { WORKSPACE_ROOT } from '../workspace.js';
import { debugLog, getDebugLogs } from '../debug-log.js';

export { getDebugLogs };

/** @deprecated Use debugLog() from debug-log.ts instead */
function dbg(msg: string): void { debugLog(msg); }

// ── Paths ───────────────────────────────────────────────────────
const SESSION_DIR = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-session');
const STATUS_FILE = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-status.json');
const QR_CACHE = path.join(WORKSPACE_ROOT, '.beehive-qr-cache.png');
const AUTH_DIR = path.join(WORKSPACE_ROOT, '.wwebjs_auth');

// ── Types ───────────────────────────────────────────────────────
interface WhatsAppStatus {
  connected: boolean;
  connectedAt?: number;
  phone?: string;
  waitingQr?: boolean;
  qrWaitStartedAt?: number;
  lastCheckAt?: number;
  error?: string;
}

interface ConnectResult {
  ok: boolean;
  message: string;
  waitingQr?: boolean;
  qrPath?: string;
}

let _whatsAppClient: any = null;       // whatsapp-web.js Client instance
let _clientReady = false;              // true after 'ready' event
let _qrBuffer: Buffer | null = null;   // last QR code as PNG buffer
let _connecting = false;               // guard against concurrent connections

// ── Status helpers ──────────────────────────────────────────────
function saveStatus(s: Partial<WhatsAppStatus>): void {
  const current = loadStatus();
  const merged = { ...current, ...s };
  try { fs.writeFileSync(STATUS_FILE, JSON.stringify(merged, null, 2), 'utf8'); } catch { /* ok */ }
}

function loadStatus(): WhatsAppStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    }
  } catch { /* ok */ }
  return { connected: false };
}

// ── QR: buffer → PNG file ──────────────────────────────────────
function saveQrBufferToFile(buffer: Buffer): void {
  try {
    fs.writeFileSync(QR_CACHE, buffer);
    dbg('[whatsapp] QR PNG salvo (' + buffer.length + ' bytes)');
  } catch (e) {
    dbg('[whatsapp] ERROR salvando QR: ' + (e instanceof Error ? e.message : String(e)));
  }
}

// ── Clear Chromium profile locks ─────────────────────────────────
/**
 * Remove arquivos de lock do Chromium (SingletonLock, SingletonSocket, etc.)
 * que podem travar o profile quando um novo container inicia enquanto
 * o Chromium do container anterior ainda não liberou o profile.
 * Isso é comum em deploys no Railway/Render.
 */
function clearChromiumLocks(): void {
  const dirsToCheck = [AUTH_DIR];
  // whatsapp-web.js LocalAuth armazena o profile em subdiretórios
  // Varrer recursivamente o AUTH_DIR procurando arquivos de lock
  const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
  let cleared = 0;
  while (dirsToCheck.length > 0) {
    const dir = dirsToCheck.pop()!;
    try {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          dirsToCheck.push(fullPath);
        } else if (entry.isFile() && lockFiles.includes(entry.name)) {
          try {
            fs.unlinkSync(fullPath);
            debugLog(`[whatsapp] Lock removido: ${fullPath}`);
            cleared++;
          } catch { /* ok — se falhar, o Chromium que lute */ }
        }
      }
    } catch { /* ignore unreadable dirs */ }
  }
  if (cleared > 0) {
    debugLog(`[whatsapp] ${cleared} arquivo(s) de lock do Chromium removido(s)`);
  }
}

// ── Get Chromium path from Playwright ───────────────────────────
async function getChromiumPath(): Promise<string | null> {
  try {
    const pw = await import('playwright');
    const path = pw.chromium.executablePath();
    dbg('[whatsapp] Chromium path: ' + path);
    return path;
  } catch {
    dbg('[whatsapp] Playwright não disponível para obter Chromium path');
    return null;
  }
}

// ── Connect ─────────────────────────────────────────────────────
export async function whatsappConnect(options?: { headless?: boolean; timeout?: number }): Promise<ConnectResult> {
  // Se já conectado, retorna imediatamente
  if (_clientReady && _whatsAppClient) {
    return { ok: true, message: 'Já conectado ao WhatsApp Web' };
  }

  // Se há sessão salva mas client não foi inicializado ainda, inicializa
  const hasSession = fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0;
  if (hasSession && !_whatsAppClient && !_connecting) {
    dbg('[whatsapp] Sessão salva encontrada, tentando reconectar...');
  }

  if (_connecting) {
    // Já tem QR disponível? Retorna imediatamente
    if (_qrBuffer) {
      return { ok: true, message: 'Aguardando scan do QR Code', waitingQr: true, qrPath: '.beehive-qr-cache.png' };
    }
    return { ok: true, message: 'Conectando...', waitingQr: true, qrPath: '.beehive-qr-cache.png' };
  }

  const isHeadless = options?.headless !== false;

  _connecting = true;
  _qrBuffer = null;
  _clientReady = false;
  // Limpa qualquer erro pendente do status
  saveStatus({ connected: false, error: undefined, waitingQr: false });
  // Remove arquivos de lock do Chromium (profile travado por container anterior)
  clearChromiumLocks();

  try {
    // ── Get Chromium executable ──
    const chromiumPath = await getChromiumPath();

    // ── Import whatsapp-web.js ──
    // Dynamic import de CJS → ESM: pode vir como default ou direto
    const wweb: any = await import('whatsapp-web.js');
    const mod = wweb.default || wweb;
    const Client: any = mod.Client;
    const LocalAuth: any = mod.LocalAuth;

    // ── Build puppeteer options ──
    const puppeteerOpts: Record<string, unknown> = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    };
    if (chromiumPath) {
      puppeteerOpts.executablePath = chromiumPath;
    }

    // ── Create client ──
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
      puppeteer: puppeteerOpts,
      qrMaxRetries: 5,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      bypassCSP: true,
    });

    _whatsAppClient = client;

    // ── Event handlers ──
    client.on('qr', async (qrRaw: string) => {
      dbg('[whatsapp] QR Code recebido (len=' + qrRaw.length + ')');
      try {
        const pngBuf: Buffer = await QRCode.toBuffer(qrRaw, {
          type: 'png', width: 400, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        _qrBuffer = pngBuf;
        saveQrBufferToFile(pngBuf);
        saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now() });
      } catch (e) {
        dbg('[whatsapp] ERROR processando QR: ' + (e instanceof Error ? e.message : String(e)));
      }
    });

    client.on('authenticated', () => {
      dbg('[whatsapp] Autenticado!');
      saveStatus({ connected: true, connectedAt: Date.now(), waitingQr: false, error: undefined });
    });

    client.on('auth_failure', (msg: string) => {
      dbg('[whatsapp] Auth failure: ' + msg + ' — aguardando novo QR Code');
      // Auth failure = sessão expirou. O client vai emitir QR em seguida.
      saveStatus({ connected: false, error: 'Sessão expirada: ' + msg + '. Escaneie o QR Code novamente.', waitingQr: true });
    });

    client.on('ready', () => {
      _clientReady = true;
      _connecting = false;
      let phone = '';
      try {
        const info = (client as any).info;
        if (info?.wid?.user) phone = info.wid.user;
      } catch { /* opcional */ }
      dbg('[whatsapp] Pronto! Telefone: ' + (phone || 'desconhecido'));
      saveStatus({ connected: true, connectedAt: Date.now(), phone, waitingQr: false, error: undefined });
    });

    client.on('disconnected', (reason: string) => {
      dbg('[whatsapp] Desconectado: ' + reason);
      _clientReady = false;
      if (_whatsAppClient === client) _whatsAppClient = null;
      saveStatus({ connected: false, error: 'Desconectado: ' + reason, waitingQr: false });
    });

    // ── Initialize client ──
    dbg('[whatsapp] Inicializando client (headless=' + isHeadless + ')');
    client.initialize().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      dbg('[whatsapp] ERROR initialize: ' + msg);
      saveStatus({ connected: false, error: msg });
      _connecting = false;
    });

    // ── Wait for the first QR ──
    // Aguarda até que o QR apareça (até 90s pra dar tempo do Chromium carregar).
    // NÃO rejeita no timeout — o client continua rodando e o QR pode chegar depois.
    let qrTimeout = false;
    const qrPromise = new Promise<void>((resolve) => {
      const cleanup: (() => void)[] = [];
      const done = () => { cleanup.forEach(fn => fn()); resolve(); };

      client.on('qr', done);
      cleanup.push(() => client.removeListener('qr', done));

      client.on('authenticated', done);
      cleanup.push(() => client.removeListener('authenticated', done));

      client.on('ready', done);
      cleanup.push(() => client.removeListener('ready', done));

      client.on('auth_failure', done);
      cleanup.push(() => client.removeListener('auth_failure', done));

      // Timeout de 90s: não rejeita, só marca e resolve
      const timer = setTimeout(() => {
        cleanup.forEach(fn => fn());
        qrTimeout = true;
        resolve(); // Não rejeita — o QR pode chegar depois do timeout
      }, 90000);
      cleanup.push(() => clearTimeout(timer));
    });
    await qrPromise;

    // Se o QR chegou (mesmo que depois do timeout), salva waiting state
    if (_qrBuffer) {
      saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now() });
      return {
        ok: true,
        message: 'QR Code gerado. Escaneie com o WhatsApp do celular.',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
    }

    // Se autenticou direto (sessão válida)
    if (_clientReady || loadStatus().connected) {
      return { ok: true, message: 'WhatsApp já conectado' };
    }

    // Timeout sem QR — mas o client ainda está rodando, pode chegar depois
    if (qrTimeout) {
      saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now(), error: undefined });
      return {
        ok: true,
        message: 'Aguardando QR Code (inicialização lenta)...',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
    }

    // QR not received yet but initialization is in progress
    saveStatus({ connected: false, waitingQr: true });
    return {
      ok: true,
      message: 'Aguardando QR Code...',
      waitingQr: true,
      qrPath: '.beehive-qr-cache.png',
    };

  } catch (e) {
    _connecting = false;
    const msg = e instanceof Error ? e.message : String(e);
    dbg('[whatsapp] ERROR connect: ' + msg);
    saveStatus({ connected: false, error: msg });
    return { ok: false, message: 'Erro ao conectar: ' + msg };
  }
}

// ── Get status ──────────────────────────────────────────────────
export function whatsappGetStatus(): WhatsAppStatus {
  const fileStatus = loadStatus();
  // O estado em memória é a fonte da verdade
  if (_clientReady && _whatsAppClient) {
    return { ...fileStatus, connected: true };
  }
  // Se o arquivo diz connected mas a memória não confirma, corrige
  if (fileStatus.connected && (!_whatsAppClient || !_clientReady)) {
    const corrected: WhatsAppStatus = {
      connected: false,
      error: 'Conexão perdida após reinício do servidor. Reconecte o WhatsApp.',
      lastCheckAt: Date.now(),
    };
    saveStatus(corrected);
    return corrected;
  }
  return fileStatus;
}

// ── Get QR image path ──────────────────────────────────────────
export function whatsappGetQrImagePath(): string | null {
  return fs.existsSync(QR_CACHE) ? QR_CACHE : null;
}

// ── Disconnect ──────────────────────────────────────────────────
export async function whatsappDisconnect(): Promise<{ ok: boolean; message: string }> {
  _connecting = false;
  if (_whatsAppClient) {
    try {
      await _whatsAppClient.destroy();
    } catch { /* ok */ }
    _whatsAppClient = null;
  }
  _clientReady = false;
  _qrBuffer = null;

  // Clean files
  try { if (fs.existsSync(QR_CACHE)) fs.unlinkSync(QR_CACHE); } catch { /* ok */ }
  try { if (fs.existsSync(SESSION_DIR)) fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch { /* ok */ }
  try { if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch { /* ok */ }

  // Limpa o status COMPLETAMENTE (incluindo qualquer erro de sessões anteriores)
  // O saveStatus faz merge, então precisamos explicitamente zerar error/waitingQr
  saveStatus({ connected: false, error: undefined, waitingQr: false });
  return { ok: true, message: 'WhatsApp desconectado' };
}

// ── Send text message ──────────────────────────────────────────
export async function whatsappSendMessage(
  phone: string,
  message: string,
): Promise<{ ok: boolean; message: string }> {
  if (!_whatsAppClient || !_clientReady) {
    return { ok: false, message: 'WhatsApp não conectado' };
  }
  try {
    // Format phone: remove any non-digit, add @c.us suffix
    const clean = phone.replace(/\D/g, '');
    const chatId = clean + '@c.us';
    const result = await _whatsAppClient.sendMessage(chatId, message);
    dbg('[whatsapp] Mensagem enviada para ' + phone + ': id=' + (result?.id?._serialized || '?'));
    return { ok: true, message: 'Mensagem enviada' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    dbg('[whatsapp] ERROR sendMessage: ' + msg);
    return { ok: false, message: msg };
  }
}

// ── Send image with caption ────────────────────────────────────
export async function whatsappSendImage(
  phone: string,
  imagePath: string,
  caption: string,
): Promise<{ ok: boolean; message: string }> {
  if (!_whatsAppClient || !_clientReady) {
    return { ok: false, message: 'WhatsApp não conectado' };
  }
  try {
    const wweb2: any = await import('whatsapp-web.js');
    const MessageMedia = (wweb2.default || wweb2).MessageMedia;
    const resolvedPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(WORKSPACE_ROOT, imagePath);
    const media = MessageMedia.fromFilePath(resolvedPath);
    const clean = phone.replace(/\D/g, '');
    const chatId = clean + '@c.us';
    const result = await _whatsAppClient.sendMessage(chatId, media, { caption });
    dbg('[whatsapp] Imagem enviada para ' + phone + ': id=' + (result?.id?._serialized || '?'));
    return { ok: true, message: 'Imagem enviada' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    dbg('[whatsapp] ERROR sendImage: ' + msg);
    return { ok: false, message: msg };
  }
}
