import type { EventName } from '../../kernel';

/**
 * Eventos da Conversa.
 *
 * Reutiliza o catálogo oficial do Kernel (`MessageReceived` / `MessageSent` /
 * `MessageStream*`, Sprint 17). Aqui ficam apenas os nomes usados e o formato
 * do payload — contrato entre o ConversationService (emite) e a UI (escuta),
 * sempre pelo Event Bus.
 */
export const CONVERSATION_EVENTS = {
  received: 'MessageReceived',
  sent: 'MessageSent',
  streamStarted: 'MessageStreamStarted',
  streamChunk: 'MessageStreamChunk',
  streamCompleted: 'MessageStreamCompleted',
  streamFailed: 'MessageStreamFailed',
  historyCleared: 'ConversationHistoryCleared',
  historyUpdated: 'ConversationHistoryUpdated',
} as const satisfies Record<string, EventName>;

export type MessageRole = 'user' | 'assistant';

export interface MessagePayload {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

/**
 * Payloads dos eventos de streaming (Sprint 17). `id` correlaciona os quatro
 * eventos de uma mesma resposta em streaming — gerado pelo Service
 * (`handleSendMessageStream`) ou, se quem despachou já tinha um (ex.: a Web,
 * para poder cancelar por id), o dele é reaproveitado tal como veio.
 */
export interface MessageStreamStartedPayload {
  id: string;
  timestamp: number;
}

export interface MessageStreamChunkPayload {
  id: string;
  delta: string;
}

export interface MessageStreamCompletedPayload {
  id: string;
  text: string;
  timestamp: number;
}

export interface MessageStreamFailedPayload {
  id: string;
  error: string;
}

/** Payloads dos eventos de memória conversacional (Sprint 18). */
export interface ConversationHistoryClearedPayload {
  conversationId: string;
  timestamp: number;
}

export interface ConversationHistoryUpdatedPayload {
  conversationId: string;
  /** Total de mensagens guardadas na conversa após a atualização (já considerando o limite). */
  messageCount: number;
  timestamp: number;
}
