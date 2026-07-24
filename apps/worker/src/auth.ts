// Autenticação por email/senha, sem dependências novas:
// - Hash de senha: crypto.scrypt (nativo do Node) com salt aleatório por usuário.
// - Token de sessão: payload em base64url + assinatura HMAC-SHA256 (formato
//   compacto parecido com JWT, mas sem lib externa).
import { randomBytes, scrypt as scryptCb, createHmac, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

const TOKEN_SECRET = process.env.AUTH_JWT_SECRET || process.env.WORKER_TOKEN || 'dev-insecure-secret-change-me';
if (TOKEN_SECRET === 'dev-insecure-secret-change-me') {
  console.warn('[auth] AUTH_JWT_SECRET não configurado — usando segredo de desenvolvimento (INSEGURO em produção).');
}
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export interface SessionPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// ---------- senha ----------
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { hash: derived.toString('hex'), salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
}

// ---------- token ----------
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signToken(userId: string, email: string): string {
  const now = Date.now();
  const payload: SessionPayload = { userId, email, iat: now, exp: now + TOKEN_TTL_MS };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
