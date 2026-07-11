/**
 * DatabaseConversationMemory — persistência de conversas em SQLite.
 *
 * Implementa `IConversationMemory` usando o `DatabaseManager`.
 * Substitui `ConversationMemory` (RAM) sem mudar nenhuma linha do
 * `ConversationService` — a interface é a mesma.
 *
 * Vantagens sobre a versão em RAM:
 *  - Sobrevive a restarts do servidor
 *  - Sem limite de mensagens (configurável via maxMessages)
 *  - Consultas por conversa são indexadas
 */

import type Database from 'better-sqlite3';
import type {
  ConversationHistory,
  ConversationMemoryMessage,
  ConversationMemoryOptions,
  IConversationMemory,
} from '../modules/conversation/ConversationMemory';

interface MessageRow {
  id: number;
  conversation_id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface ConversationRow {
  id: string;
  created_at: number;
  updated_at: number;
}

/**
 * DatabaseConversationMemory — histórico de conversas persistente.
 *
 * Uso:
 *   const memory = new DatabaseConversationMemory(dbManager.db);
 *   const service = new ConversationService({ memory });
 */
export class DatabaseConversationMemory implements IConversationMemory {
  private readonly db: Database.Database;
  private readonly maxMessages: number;

  constructor(db: Database.Database, options: ConversationMemoryOptions = {}) {
    this.db = db;
    this.maxMessages = options.maxMessages ?? 100; // Mais generoso que RAM (30)
  }

  async append(conversationId: string, message: ConversationMemoryMessage): Promise<void> {
    // Garante que a conversa existe
    this.ensureConversation(conversationId);

    // Insere a mensagem
    this.db
      .prepare(
        'INSERT INTO messages (conversation_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
      )
      .run(conversationId, message.role, message.content, message.timestamp);

    // Atualiza o timestamp da conversa
    this.db
      .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
      .run(message.timestamp, conversationId);

    // Aplica limite FIFO: remove as mais antigas se exceder maxMessages
    this.enforceLimit(conversationId);
  }

  async history(conversationId: string): Promise<readonly ConversationMemoryMessage[]> {
    const rows = this.db
      .prepare(
        'SELECT role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
      )
      .all(conversationId) as MessageRow[];

    return rows.map((row) => ({
      role: row.role as ConversationMemoryMessage['role'],
      content: row.content,
      timestamp: row.timestamp,
    }));
  }

  async snapshot(conversationId: string): Promise<ConversationHistory | undefined> {
    const conv = this.db
      .prepare('SELECT id, created_at, updated_at FROM conversations WHERE id = ?')
      .get(conversationId) as ConversationRow | undefined;

    if (!conv) return undefined;

    const messages = await this.history(conversationId);

    return {
      conversationId: conv.id,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messages,
    };
  }

  async clear(conversationId: string): Promise<void> {
    // ON DELETE CASCADE cuida das mensagens automaticamente
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
  }

  async count(conversationId: string): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?')
      .get(conversationId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  /** Lista todas as conversas (útil para UI de histórico). */
  async listConversations(): Promise<readonly ConversationHistory[]> {
    const convs = this.db
      .prepare('SELECT id, created_at, updated_at FROM conversations ORDER BY updated_at DESC')
      .all() as ConversationRow[];

    const result: ConversationHistory[] = [];
    for (const conv of convs) {
      const messages = await this.history(conv.id);
      result.push({
        conversationId: conv.id,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        messages,
      });
    }
    return result;
  }

  // ---------------------------- Privados ----------------------------

  private ensureConversation(conversationId: string): void {
    const exists = this.db
      .prepare('SELECT 1 FROM conversations WHERE id = ?')
      .get(conversationId);
    if (exists) return;

    const now = Date.now();
    this.db
      .prepare('INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)')
      .run(conversationId, now, now);
  }

  private enforceLimit(conversationId: string): void {
    const count = this.db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?')
      .get(conversationId) as { count: number };

    if (count.count <= this.maxMessages) return;

    // Remove as mensagens mais antigas que excedem o limite
    const excess = count.count - this.maxMessages;
    this.db
      .prepare(
        `DELETE FROM messages WHERE id IN (
          SELECT id FROM messages
          WHERE conversation_id = ?
          ORDER BY timestamp ASC
          LIMIT ?
        )`,
      )
      .run(conversationId, excess);
  }
}