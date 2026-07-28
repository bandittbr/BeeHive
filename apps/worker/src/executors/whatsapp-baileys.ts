/**
 * Executor WhatsApp via Baileys (protocolo MD, sem browser)
 * =========================================================
 * Usa @whiskeysockets/baileys — implementação pura em Node.js do protocolo
 * WebSocket do WhatsApp Web. NÃO precisa de Chromium / Puppeteer / headless.
 *
 * Fluxo (Railway):
 *   1. whatsappConnect() → makeWASocket com auth state em .baileys-auth/
 *   2. Evento 'qr' (connection.update) → salva PNG em .beehive-qr-cache.png
 *   3. GET /api/whatsapp/qr-image → serve o PNG pro frontend
 *   4. Evento 'open' (connection === 'open') → autenticado e pronto
 *   5. Sessão salva automaticamente via useMultiFileAuthState
 *   6. Reconexão automática em caso de queda (connection === 'close')
 */

import path from 'node:path';
import fs from 'node:fs';
import QRCode from 'qrcode';
import { WORKSPACE_ROOT } from '../workspace.js';
import { debugLog, getDebugLogs } from '../debug-log.js';

export { getDebugLogs };

// ── Paths ───────────────────────────────────────────────────────
const AUTH_DIR = path.join(WORKSPACE_ROOT, '.baileys-auth');
const STATUS_FILE = path.join(WORKSPACE_ROOT, '.beehive-whatsapp-status.json');
const QR_CACHE = path.join(WORKSPACE_ROOT, '.beehive-qr-cache.png');

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

let _sock: any = null;            // Baileys WASocket instance
let _clientReady = false;        // true after connection === 'open'
let _qrBuffer: Buffer | null = null;
let _connecting = false;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _lastDisconnectReason: string | null = null;

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
    debugLog('[baileys] QR PNG salvo (' + buffer.length + ' bytes)');
  } catch (e) {
    debugLog('[baileys] ERROR salvando QR: ' + (e instanceof Error ? e.message : String(e)));
  }
}

// ── Connect ─────────────────────────────────────────────────────
export async function whatsappConnect(options?: { headless?: boolean; timeout?: number }): Promise<ConnectResult> {
  // Se já conectado, retorna imediatamente
  if (_clientReady && _sock) {
    return { ok: true, message: 'Já conectado ao WhatsApp' };
  }

  if (_connecting) {
    if (_qrBuffer) {
      return { ok: true, message: 'Aguardando scan do QR Code', waitingQr: true, qrPath: '.beehive-qr-cache.png' };
    }
    return { ok: true, message: 'Conectando...', waitingQr: true, qrPath: '.beehive-qr-cache.png' };
  }

  _connecting = true;
  _qrBuffer = null;
  _clientReady = false;
  // RESETA completamente o status (sem merge com dados velhos do volume)
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ connected: false }, null, 2), 'utf8');
  // Remove QR cache de deploy anterior
  try { if (fs.existsSync(QR_CACHE)) fs.unlinkSync(QR_CACHE); } catch { /* ok */ }

  try {
    // ── Import baileys ──
    const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = await import('@whiskeysockets/baileys');
    const pino = (await import('pino')).default;

    // Logger silencioso (erros apenas)
    const logger = pino({ level: 'warn' });

    // ── Auth state ──
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // ── Create socket (WebSocket puro, sem browser!) ──
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // nós capturamos o QR manualmente
      logger,
      browser: Browsers.baileys('BeeHive'),
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
    });

    _sock = sock;

    // ── Connection update handler ──
    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code recebido
      if (qr) {
        debugLog('[baileys] QR Code recebido (len=' + qr.length + ')');
        QRCode.toBuffer(qr, {
          type: 'png', width: 400, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        }).then((pngBuf: Buffer) => {
          _qrBuffer = pngBuf;
          saveQrBufferToFile(pngBuf);
          saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now() });
        }).catch((e: any) => {
          debugLog('[baileys] ERROR processando QR: ' + (e instanceof Error ? e.message : String(e)));
        });
      }

      // Conectado!
      if (connection === 'open') {
        _clientReady = true;
        _connecting = false;
        _qrBuffer = null;
        let phone = '';
        try {
          if (sock.user?.id) {
            phone = sock.user.id.split(':')[0];
          }
        } catch { /* opcional */ }
        debugLog('[baileys] Conectado! Telefone: ' + (phone || 'desconhecido'));
        saveStatus({ connected: true, connectedAt: Date.now(), phone, waitingQr: false, error: undefined });
      }

      // Desconectado
      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode ?? 500;
        const reasonStr = DisconnectReason ? (DisconnectReason[reason] || 'Unknown') : String(reason);
        debugLog('[baileys] Desconectado: ' + reasonStr + ' (code=' + reason + ')');
        _clientReady = false;
        _lastDisconnectReason = reasonStr;

        if (_sock === sock) _sock = null;

        // Se foi logout, não reconecta
        const isLogout = reason === DisconnectReason?.loggedOut;
        if (isLogout) {
          debugLog('[baileys] Logout detectado — limpando sessão');
          // Limpa auth dir pra forçar novo QR
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch { /* ok */ }
          saveStatus({ connected: false, error: 'Sessão expirada. Escaneie o QR novamente.' });
          return;
        }

        saveStatus({ connected: false, error: 'Desconectado: ' + reasonStr, waitingQr: false });

        // Reconexão automática (se não estamos num connect manual)
        if (!_connecting && !isLogout) {
          const delay = Math.min(10000, (_reconnectTimer ? 5000 : 1000));
          debugLog('[baileys] Reconectando em ' + delay + 'ms...');
          _reconnectTimer = setTimeout(() => {
            _reconnectTimer = null;
            _connecting = false; // permite nova conexão
            whatsappConnect({ headless: true }).catch((e) => {
              debugLog('[baileys] ERRO na reconexão: ' + (e instanceof Error ? e.message : String(e)));
            });
          }, delay);
        }
      }
    });

    // ── Salva credenciais quando atualizadas ──
    sock.ev.on('creds.update', saveCreds);

    // ── Wait for first event ──
    let qrTimeout = false;
    const firstEventPromise = new Promise<void>((resolve) => {
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearTimeout(timer);
        // Não podemos remover listeners do ev on baileys facilmente,
        // mas marcamos que não precisamos mais
      };

      const timer = setTimeout(() => {
        cleanup();
        qrTimeout = true;
        resolve();
      }, (options?.timeout ?? 90000));

      // Polling via connection.update listener
      // O handler acima já está configurado — a promise apenas aguarda
      // o primeiro evento significativo.

      // Mas precisamos de um mecanismo para resolver.
      // Vamos verificar a cada 500ms se já temos qr ou connected
      const interval = setInterval(() => {
        const status = loadStatus();
        if (status.connected || _qrBuffer || qrTimeout) {
          clearInterval(interval);
          cleanup();
          resolve();
        }
      }, 500);

      // Garante que o interval não vaze
      cleanup._interval = interval;
    });

    await firstEventPromise;

    // Se autenticou
    if (_clientReady || loadStatus().connected) {
      _qrBuffer = null;
      return { ok: true, message: 'WhatsApp conectado' };
    }

    // Se o QR chegou
    if (_qrBuffer) {
      saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now() });
      return {
        ok: true,
        message: 'QR Code gerado. Escaneie com o WhatsApp do celular.',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
    }

    // Timeout sem QR
    if (qrTimeout) {
      saveStatus({ connected: false, waitingQr: true, qrWaitStartedAt: Date.now(), error: undefined });
      return {
        ok: true,
        message: 'Aguardando QR Code (conexão WebSocket)...',
        waitingQr: true,
        qrPath: '.beehive-qr-cache.png',
      };
    }

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
    debugLog('[baileys] ERROR connect: ' + msg);
    saveStatus({ connected: false, error: msg });
    return { ok: false, message: 'Erro ao conectar: ' + msg };
  }
}

// ── Get status ──────────────────────────────────────────────────
export function whatsappGetStatus(): WhatsAppStatus {
  const fileStatus = loadStatus();

  if (_clientReady && _sock) {
    // Client pronto — força connected=true e limpa erro/waitingQr
    saveStatus({ connected: true, error: undefined, waitingQr: false });
    return { ...fileStatus, connected: true, error: undefined, waitingQr: false };
  }

  if (_sock) {
    // Client existe mas ainda não está pronto
    if (fileStatus.connected) {
      return { ...fileStatus, connected: true };
    }
    return fileStatus;
  }

  // Não há client algum — limpa estado residual de deploy anterior
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
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }

  if (_sock) {
    try {
      _sock.end(new Error('Disconnected by user'));
      _sock.ws?.close();
    } catch { /* ok */ }
    _sock = null;
  }
  _clientReady = false;
  _qrBuffer = null;

  // Clean files
  try { if (fs.existsSync(QR_CACHE)) fs.unlinkSync(QR_CACHE); } catch { /* ok */ }
  try { if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch { /* ok */ }

  saveStatus({ connected: false, error: undefined, waitingQr: false });
  return { ok: true, message: 'WhatsApp desconectado' };
}

// ── Send text message ──────────────────────────────────────────
export async function whatsappSendMessage(
  phone: string,
  message: string,
): Promise<{ ok: boolean; message: string }> {
  if (!_sock || !_clientReady) {
    return { ok: false, message: 'WhatsApp não conectado' };
  }
  try {
    // Normaliza phone: remove não-dígitos, assume DDI 55 se começar com 0 ou se não tiver DDI
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      // Número brasileiro sem DDI
      clean = '55' + clean;
    }

    // O formato do JID do Baileys é: DDI+DDD+NUMERO@s.whatsapp.net
    const chatId = clean + '@s.whatsapp.net';
    const result = await _sock.sendMessage(chatId, { text: message });
    debugLog('[baileys] Mensagem enviada para ' + phone + ': id=' + (result?.key?.id || '?'));
    return { ok: true, message: 'Mensagem enviada' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    debugLog('[baileys] ERROR sendMessage: ' + msg);
    return { ok: false, message: msg };
  }
}

// ── Send image with caption ────────────────────────────────────
export async function whatsappSendImage(
  phone: string,
  imagePath: string,
  caption: string,
): Promise<{ ok: boolean; message: string }> {
  if (!_sock || !_clientReady) {
    return { ok: false, message: 'WhatsApp não conectado' };
  }
  try {
    const resolvedPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(WORKSPACE_ROOT, imagePath);

    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, message: 'Arquivo de imagem não encontrado: ' + resolvedPath };
    }

    const imageBuffer = fs.readFileSync(resolvedPath);

    // Normaliza phone igual ao sendMessage
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
    const chatId = clean + '@s.whatsapp.net';

    const result = await _sock.sendMessage(chatId, {
      image: imageBuffer,
      caption: caption || '',
    });
    debugLog('[baileys] Imagem enviada para ' + phone + ': id=' + (result?.key?.id || '?'));
    return { ok: true, message: 'Imagem enviada' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    debugLog('[baileys] ERROR sendImage: ' + msg);
    return { ok: false, message: msg };
  }
}
