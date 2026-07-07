import type { ChatMessage } from '../../ai';

/**
 * ConversationMemory — memória de sessão do módulo Conversa (Sprint 18).
 *
 * Guarda o histórico de cada conversa (por `conversationId`) inteiramente em
 * RAM, para o `ConversationService` montar `messages = [...history, novaMensagem]`
 * antes de cada chamada ao `AIManager` — é o que dá contexto entre mensagens.
 * NINGUÉM fora do módulo Conversa conhece este arquivo: não é reexportado
 * pelo barrel do módulo nem pelo pacote (`src/index.ts`).
 *
 * Reutiliza `ChatMessage` (role/content) da AI Layer — só acrescenta
 * `timestamp`, sem duplicar o contrato.
 *
 * Sem banco de dados, sem persistência, sem RAG/embeddings/resumo — só um
 * `Map` em memória, por processo, apagado a cada restart do Runtime (memória
 * de SESSÃO, não permanente).
 */
export interface ConversationMemoryMessage extends ChatMessage {
  readonly timestamp: number;
}

/** Retrato completo de uma conversa guardada. */
export interface ConversationHistory {
  readonly conversationId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly messages: readonly ConversationMemoryMessage[];
}

export interface ConversationMemoryOptions {
  /** Máximo de mensagens guardadas por conversa. Acima disso, as mais antigas são descartadas (FIFO — nunca resumidas/compactadas). Padrão: 30. */
  maxMessages?: number;
}

/**
 * Contrato público — DELIBERADAMENTE assíncrono (mesmo a implementação em RAM
 * resolvendo na hora) para que uma Sprint futura possa trocar por uma
 * implementação com persistência em banco de dados SEM mudar esta interface
 * nem o `ConversationService` (que só depende deste contrato, nunca da
 * implementação concreta — mesmo padrão de DI usado em todo o resto do
 * sistema, ex.: `ToolExecutor`, `AIProviderRegistry`).
 */
export interface IConversationMemory {
  /** Acrescenta uma mensagem ao histórico da conversa (cria a conversa se for a primeira). */
  append(conversationId: string, message: ConversationMemoryMessage): Promise<void>;
  /** Histórico da conversa, em ordem cronológica. `[]` se a conversa não existe/está vazia. */
  history(conversationId: string): Promise<readonly ConversationMemoryMessage[]>;
  /** Retrato completo (inclui createdAt/updatedAt). `undefined` se a conversa não existe. */
  snapshot(conversationId: string): Promise<ConversationHistory | undefined>;
  /** Remove todo o histórico da conversa. Idempotente — limpar uma conversa inexistente não lança. */
  clear(conversationId: string): Promise<void>;
  /** Quantidade de mensagens guardadas na conversa (0 se não existe). */
  count(conversationId: string): Promise<number>;
}

const DEFAULT_MAX_MESSAGES = 30;

interface StoredConversation {
  createdAt: number;
  updatedAt: number;
  messages: ConversationMemoryMessage[];
}

/** Implementação em RAM de `IConversationMemory` — um `Map<conversationId, StoredConversation>`. */
export class ConversationMemory implements IConversationMemory {
  private readonly conversations = new Map<string, StoredConversation>();
  private readonly maxMessages: number;

  constructor(options: ConversationMemoryOptions = {}) {
    this.maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  }

  async append(conversationId: string, message: ConversationMemoryMessage): Promise<void> {
    const now = Date.now();
    const existing = this.conversations.get(conversationId);
    if (!existing) {
      this.conversations.set(conversationId, { createdAt: now, updatedAt: now, messages: [message] });
      return;
    }
    existing.messages.push(message);
    // Limite (padrão 30): descarta as mais antigas — nunca resume/compacta.
    if (existing.messages.length > this.maxMessages) {
      existing.messages.splice(0, existing.messages.length - this.maxMessages);
    }
    existing.updatedAt = now;
  }

  async history(conversationId: string): Promise<readonly ConversationMemoryMessage[]> {
    return this.conversations.get(conversationId)?.messages ?? [];
  }

  async snapshot(conversationId: string): Promise<ConversationHistory | undefined> {
    const existing = this.conversations.get(conversationId);
    if (!existing) return undefined;
    return {
      conversationId,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      messages: existing.messages,
    };
  }

  async clear(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
  }

  async count(conversationId: string): Promise<number> {
    return this.conversations.get(conversationId)?.messages.length ?? 0;
  }
}
