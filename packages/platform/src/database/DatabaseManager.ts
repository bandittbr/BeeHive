/**
 * DatabaseManager — gestão central do SQLite do BeeHive.
 *
 * Responsável por abrir/conectar o banco, criar o schema inicial e expor
 * a instância do banco para os módulos que precisam de persistência
 * (ConversationMemory, Settings, Agents, etc.).
 *
 * Usa better-sqlite3 (síncrono, sem dependências de rede, ideal para
 * embedded). O arquivo do banco fica em `data/beehive.db` por padrão.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ILogger } from '../kernel';
import { AFFILIATES_SCHEMA } from './affiliatesSchema';
import { SHORTS_SCHEMA } from './shortsSchema';

export interface DatabaseManagerOptions {
  /** Caminho do arquivo SQLite. Padrão: data/beehive.db */
  dbPath?: string;
  /** Logger para eventos do banco. */
  logger?: ILogger;
}

const DEFAULT_DB_PATH = 'data/beehive.db';

/**
 * Schema inicial do BeeHive.
 *
 * Tabelas criadas na primeira execução (CREATE TABLE IF NOT EXISTS).
 * Migrações futuras são aplicadas incrementalmente via `migrate()`.
 */
const SCHEMA_SQL = `
-- Conversas: uma linha por conversa (id, timestamps)
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Mensagens: uma linha por mensagem, vinculada a uma conversa
CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
  content         TEXT NOT NULL,
  timestamp       INTEGER NOT NULL
);

-- Índice para buscar mensagens por conversa (ordem cronológica)
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, timestamp);

-- Configurações do sistema (chave-valor persistente)
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- Migrações aplicadas (versionamento do schema)
CREATE TABLE IF NOT EXISTS migrations (
  version   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);

-- Projetos: diretórios locais adicionados pelo usuário
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  path            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  created_at      INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  color           TEXT DEFAULT '',
  icon            TEXT DEFAULT '📁',
  pinned          INTEGER DEFAULT 0,
  tags            TEXT DEFAULT ''
);
`;

/**
 * DatabaseManager — ponto único de acesso ao SQLite.
 *
 * Thread-safe (better-sqlite3 é síncrono, sem concorrência).
 * O banco é criado automaticamente na primeira execução.
 */
export class DatabaseManager {
  readonly db: Database.Database;
  private readonly logger?: ILogger;

  constructor(options: DatabaseManagerOptions = {}) {
    const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
    this.logger = options.logger?.child('database');

    // Garante que o diretório data/ existe
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.ensureSchema();
    this.logger?.info(`Banco SQLite aberto: ${dbPath}`);
  }

  /** Aplica o schema inicial (idempotente: CREATE TABLE IF NOT EXISTS). */
  private ensureSchema(): void {
    this.db.exec(SCHEMA_SQL);
    this.db.exec(AFFILIATES_SCHEMA);
    this.db.exec(SHORTS_SCHEMA);
  }

  /** Fecha o banco com segurança. */
  close(): void {
    this.db.close();
    this.logger?.info('Banco SQLite fechado.');
  }

  /** Executa uma query que retorna múltiplas linhas. */
  queryAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    return (params ? this.db.prepare(sql).all(...params) : this.db.prepare(sql).all()) as T[];
  }

  /** Executa uma query que retorna uma única linha (ou undefined). */
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
    return (params ? this.db.prepare(sql).get(...params) : this.db.prepare(sql).get()) as T | undefined;
  }

  /** Executa uma instrução SQL (INSERT/UPDATE/DELETE). */
  execute(sql: string, params?: unknown[]): void {
    if (params) {
      this.db.prepare(sql).run(...params);
    } else {
      this.db.exec(sql);
    }
  }

  /** Versão atual do schema (última migração aplicada). */
  schemaVersion(): number {
    const row = this.db
      .prepare('SELECT MAX(version) as version FROM migrations')
      .get() as { version: number | null } | undefined;
    return row?.version ?? 0;
  }

  /** Aplica uma migração (idempotente: só aplica se a versão não existir). */
  applyMigration(version: number, name: string, sql: string): void {
    const existing = this.db
      .prepare('SELECT 1 FROM migrations WHERE version = ?')
      .get(version);
    if (existing) return;

    this.db.exec(sql);
    this.db
      .prepare('INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)')
      .run(version, name, Date.now());
    this.logger?.info(`Migração aplicada: v${version} ${name}`);
  }
}