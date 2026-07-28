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
 * Remove o diretório session/ do LocalAuth (onde o Chromium armazena o
 * perfil e os locks SingletonLock/SingletonSocket).
 * Quando um novo container Railway inicia, o Chromium do container anterior
 * pode ter deixado o profile travado. Removendo session/ recriamos o perfil.
 * A sessão do WhatsApp fica em .wwebjs_auth/session/Session/ e será perdida,
 * mas isso é melhor do que o Chromium travar com "profile in use".
 * O usuário precisará escanear o QR novamente após reinício.
 */
function clearChromiumLocks(): void {
  const sessionDir = path.join(AUTH_DIR, 'session');
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      debugLog('[whatsapp] Perfil Chromium session/ removido (locks limpos)');
    } catch (e) {
      debugLog('[whatsapp] ERRO ao remover session/: ' + (e instanceof Error ? e.message : String(e)));
    }
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
  // RESETA completamente o status (sem merge com dados velhos do volume)
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ connected: false }, null, 2), 'utf8');
  // Remove QR cache de deploy anterior (volume persistente)
  try { if (fs.existsSync(QR_CACHE)) fs.unlinkSync(QR_CACHE); } catch { /* ok */ }
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
      qrMaxRetries: 50,
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
      _qrBuffer = null; // QR já foi escaneado, não precisa mais
      // NÃO seta _clientReady ainda — só o 'ready' faz isso
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
    // Também resolve em authenticated/ready (usuário escaneou rápido) e auth_failure.
    let qrTimeout = false;
    const firstEventPromise = new Promise<void>((resolve) => {
      const cleanup: (() => void)[] = [];
      const done = () => { cleanup.forEach(fn => fn()); resolve(); };

      // NOTA: 'qr' resolve IMEDIATAMENTE para que o frontend mostre o QR logo.
      // Se o usuário escanear antes do timeout, 'authenticated' ou 'ready'
      // também resolvem, e a promise já estava resolvida mesmo.
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
    await firstEventPromise;

    // Se autenticou / ficou pronto (sessão válida ou scan ultra-rápido)
    if (_clientReady || loadStatus().connected) {
      // Garante que o QR buffer não fique como pendente
      _qrBuffer = null;
      return { ok: true, message: 'WhatsApp conectado' };
    }

    // Se o QR chegou, retorna waiting
    if (_qrBuffer) {
      saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now() });
      return {
        ok: true,
        message: 'QR Code gerado. Escaneie com o WhatsApp do celular.',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
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
    // Se o client está pronto, força connected=true e limpa erro/waitingQr
    saveStatus({ connected: true, error: undefined, waitingQr: false });
    return { ...fileStatus, connected: true, error: undefined, waitingQr: false };
  }
  // Há um client em andamento (autenticado ou aguardando QR) — NÃO corrige
  if (_whatsAppClient) {
    // O client existe mas ainda não está pronto — pode estar entre authenticated e ready
    if (fileStatus.connected) {
      return { ...fileStatus, connected: true };
    }
    return fileStatus;
  }
  // Não há client algum — limpa qualquer estado residual de deploy anterior
  // (waitingQr, phone, connectedAt) que possa ter persistido no volume
  if (fileStatus.waitingQr || fileStatus.connected || fileStatus.phone) {
    const clean: WhatsAppStatus = {
      connected: false,
      error: fileStatus.connected
        ? 'Conexão perdida após reinício do servidor. Reconecte o WhatsApp.'
        : undefined,
      waitingQr: false,
      lastCheckAt: Date.now(),
    };
    saveStatus(clean);
    // QR cache de deploy anterior também precisa sumir
    try { if (fs.existsSync(QR_CACHE)) fs.unlinkSync(QR_CACHE); } catch { /* ok */ }
    return clean;
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
