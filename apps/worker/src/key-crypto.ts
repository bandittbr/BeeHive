// Criptografia das API keys dos usuários (BYOK) em repouso no banco.
// AES-256-GCM com ENCRYPTION_KEY (32 bytes em hex — já documentada em .env.example).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY ausente ou inválida (precisa ter 32 bytes em hex — 64 caracteres). Configure essa variável no Railway.');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptSecret(plain: string): { encrypted: string; iv: string; tag: string } {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: encrypted.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
}

export function decryptSecret(encrypted: string, iv: string, tag: string): string {
  const key = getKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskSecret(plain: string): string {
  if (plain.length <= 8) return '••••••••';
  return `${plain.slice(0, 4)}${'•'.repeat(Math.min(20, plain.length - 8))}${plain.slice(-4)}`;
}
