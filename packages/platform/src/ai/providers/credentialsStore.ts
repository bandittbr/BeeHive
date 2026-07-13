/**
 * ProviderCredentialsStore — persistência criptografada de credenciais de providers.
 *
 * Armazena API keys e base URLs customizadas no SQLite (better-sqlite3),
 * com criptografia AES-256-GCM. A chave de criptografia é derivada de um
 * segredo da máquina (hostname + username + salt fixo) via PBKDF2.
 *
 * Segurança:
 * - API keys NUNCA ficam em texto plano no banco
 * - Chave de criptografia derivada via PBKDF2 (100k iterações, SHA-256)
 * - Cada credential tem seu próprio IV (nonce) para AES-256-GCM
 * - O segredo da máquina é simples mas suficiente para proteger contra
 *   leitura casual do banco (não é segurança de verdade — é um product,
 *   não um cofre). Quem tem acesso ao filesystem já tem acesso ao .env.
 *
 * Uso:
 *   const store = new ProviderCredentialsStore(db);
 *   store.save('openai', { apiKey: 'sk-...', baseUrl: undefined });
 *   const creds = store.load('openai'); // { apiKey: 'sk-...', baseUrl: undefined }
 */
import type Database from 'better-sqlite3';
import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'node:crypto';
import os from 'node:os';

/** Credenciais salvas de um provider. */
export interface StoredCredentials {
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

/** Metadados de uma credencial salva. */
export interface CredentialMeta {
  readonly providerId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Dados brutos do banco (criptografados). */
interface CredentialRow {
  provider_id: string;
  encrypted_data: Buffer;
  iv: Buffer;
  created_at: number;
  updated_at: number;
}

// ── Criptografia ──────────────────────────────────────────────────────────

const SALT = 'beehive-provider-credentials-v1';
const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits (recomendado para GCM)

/**
 * Deriva a chave de criptografia a partir de um segredo da máquina.
 * O segredo é composto por hostname + username, o que torna o banco
 * ilegível se copiado para outra máquina (proteção básica contra exfiltração).
 */
function deriveKey(machineSecret: string): Buffer {
  return pbkdf2Sync(machineSecret, SALT, ITERATIONS, KEY_LENGTH, 'sha256');
}

/** Obtém o segredo da máquina (hostname + username). */
function getMachineSecret(): string {
  const hostname = os.hostname();
  const username = os.userInfo().username;
  return `${hostname}:${username}`;
}

function encrypt(plaintext: string, key: Buffer): { ciphertext: Buffer; iv: Buffer } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([encrypted, tag]), iv };
}

function decrypt(ciphertext: Buffer, iv: Buffer, key: Buffer): string {
  const tag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Store ─────────────────────────────────────────────────────────────────

export class ProviderCredentialsStore {
  private readonly db: Database.Database;
  private readonly key: Buffer;
  private readonly insertStmt: Database.Statement;
  private readonly updateStmt: Database.Statement;
  private readonly deleteStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.key = deriveKey(getMachineSecret());

    // Cria a tabela se não existir
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS provider_credentials (
        provider_id TEXT PRIMARY KEY,
        encrypted_data BLOB NOT NULL,
        iv BLOB NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    this.insertStmt = this.db.prepare(`
      INSERT INTO provider_credentials (provider_id, encrypted_data, iv, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE provider_credentials
      SET encrypted_data = ?, iv = ?, updated_at = ?
      WHERE provider_id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM provider_credentials WHERE provider_id = ?
    `);
  }

  /** Salva as credenciais de um provider (upsert). */
  save(providerId: string, credentials: StoredCredentials): void {
    const json = JSON.stringify(credentials);
    const { ciphertext, iv } = encrypt(json, this.key);
    const now = Date.now();

    const existing = this.db.prepare('SELECT provider_id FROM provider_credentials WHERE provider_id = ?').get(providerId);
    if (existing) {
      this.updateStmt.run(ciphertext, iv, now, providerId);
    } else {
      this.insertStmt.run(providerId, ciphertext, iv, now, now);
    }
  }

  /** Carrega as credenciais de um provider. Retorna undefined se não existir. */
  load(providerId: string): StoredCredentials | undefined {
    const row = this.db.prepare(
      'SELECT encrypted_data, iv FROM provider_credentials WHERE provider_id = ?'
    ).get(providerId) as CredentialRow | undefined;

    if (!row) return undefined;

    try {
      const json = decrypt(row.encrypted_data, row.iv, this.key);
      return JSON.parse(json) as StoredCredentials;
    } catch {
      // Chave de criptografia mudou (máquina diferente) ou dados corrompidos
      return undefined;
    }
  }

  /** Remove as credenciais de um provider. */
  delete(providerId: string): boolean {
    const result = this.deleteStmt.run(providerId);
    return result.changes > 0;
  }

  /** Lista todos os providers que têm credenciais salvas. */
  list(): readonly CredentialMeta[] {
    const rows = this.db.prepare(
      'SELECT provider_id, created_at, updated_at FROM provider_credentials'
    ).all() as Array<{ provider_id: string; created_at: number; updated_at: number }>;

    return rows.map((r) => ({
      providerId: r.provider_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /** Verifica se um provider tem credenciais salvas. */
  has(providerId: string): boolean {
    const row = this.db.prepare(
      'SELECT 1 FROM provider_credentials WHERE provider_id = ?'
    ).get(providerId);
    return row !== undefined;
  }
}
