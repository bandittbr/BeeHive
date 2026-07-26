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

// ── Debug log ring buffer ───────────────────────────────────────
const __debugLogs: string[] = [];
const MAX_DEBUG_LOGS = 200;
function dbg(msg: string): void {
  const ts = new Date().toISOString().slice(11, 23);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  __debugLogs.push(line);
  if (__debugLogs.length > MAX_DEBUG_LOGS) __debugLogs.splice(0, __debugLogs.length - MAX_DEBUG_LOGS);
}
export function getDebugLogs(): string[] { return [...__debugLogs]; }

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
  const status = loadStatus();
  if (status.connected && _clientReady) {
    return { ok: true, message: 'Já conectado ao WhatsApp Web' };
  }

  if (_connecting) {
    return { ok: true, message: 'Já aguardando scan do QR Code', waitingQr: true, qrPath: '.beehive-qr-cache.png' };
  }

  const timeout = options?.timeout ?? 120000;
  const isHeadless = options?.headless !== false;

  _connecting = true;
  _qrBuffer = null;
  _clientReady = false;

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
      headless: isHeadless ? 'shell' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    };
    if (chromiumPath) {
      puppeteerOpts.executablePath = chromiumPath;
    }

    // ── Create client ──
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
      puppeteer: puppeteerOpts,
      qrMaxRetries: 3,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      bypassCSP: true,
    });

    _whatsAppClient = client;

    // ── Event handlers ──
    client.on('qr', async (qrRaw: string) => {
      dbg('[whatsapp] QR Code recebido do evento (raw len=' + qrRaw.length + ')');
      try {
        // qrRaw é a string crua do QR (ex: "1@abc123,...") — geramos o PNG
        const pngBuf: Buffer = await QRCode.toBuffer(qrRaw, {
          type: 'png',
          width: 400,
          margin: 2,
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
      dbg('[whatsapp] Auth failure: ' + msg);
      saveStatus({ connected: false, error: 'Falha de autenticação: ' + msg, waitingQr: false });
    });

    client.on('ready', () => {
      _clientReady = true;
      _connecting = false;
      let phone = '';
      try {
        const info = (client as any).info;
        if (info && info.wid && info.wid.user) {
          phone = info.wid.user;
        }
      } catch { /* opcional */ }
      dbg('[whatsapp] Cliente pronto! Telefone: ' + (phone || 'desconhecido'));
      saveStatus({ connected: true, connectedAt: Date.now(), phone, waitingQr: false, error: undefined });
    });

    client.on('disconnected', (reason: string) => {
      dbg('[whatsapp] Desconectado: ' + reason);
      _clientReady = false;
      if (_whatsAppClient === client) {
        _whatsAppClient = null;
      }
      saveStatus({ connected: false, error: 'Desconectado: ' + reason, waitingQr: false });
    });

    // ── Initialize client ──
    dbg('[whatsapp] Inicializando client whatsapp-web.js (headless=' + isHeadless + ')');
    client.initialize().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      dbg('[whatsapp] ERROR initialize: ' + msg);
      saveStatus({ connected: false, error: msg });
      _connecting = false;
    });

    // ── Wait for QR or ready ──
    // We wait up to 10 seconds for the QR event, then return
    const qrPromise = new Promise<void>((resolve) => {
      const onQr = () => { client.removeListener('qr', onQr); resolve(); };
      client.on('qr', onQr);
      // Also resolve on error/ready/authenticated
      client.on('authenticated', () => resolve());
      client.on('ready', () => resolve());
      client.on('auth_failure', () => resolve());
      setTimeout(resolve, 10000); // timeout 10s
    });
    await qrPromise;

    if (_qrBuffer) {
      return {
        ok: true,
        message: 'QR Code gerado. Escaneie com o WhatsApp do celular.',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
    }

    // Check if somehow already connected
    if (_clientReady || loadStatus().connected) {
      return { ok: true, message: 'WhatsApp já conectado' };
    }

    // QR not received yet but initialization is in progress
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
  return loadStatus();
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

  saveStatus({ connected: false });
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
