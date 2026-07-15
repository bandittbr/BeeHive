import type { ConversationMemoryMessage } from './ConversationMemory';
import type { FileAttachment as FileAttachmentType } from './types';

/**
 * Comandos da Conversa.
 *
 * Toda ação é um Command (dado). A UI despacha `conversation.sendMessage`; o
 * Kernel encaminha ao handler que o módulo registrou, que delega ao Service.
 *
 * Sprint 17 (streaming): `sendMessageStream` inicia uma resposta em
 * streaming — o resultado ({id, reply}) só chega quando o streaming termina,
 * mas os pedaços saem ANTES disso, por eventos (`MessageStream*`). Como um
 * `AbortSignal` não atravessa a fronteira HTTP, cancelamento em andamento usa
 * um comando à parte (`cancelStream`, por `id`) em vez de um sinal — o
 * Kernel Command Bus não muda (mesmo `dispatch(command)` de sempre).
 *
 * Sprint 18 (memória): `sendMessage`/`sendMessageStream` ganham um
 * `conversationId` opcional — cada conversa tem seu próprio histórico
 * (`ConversationMemory`), enviado automaticamente ao `AIManager` em toda
 * chamada. Sem `conversationId`, cai numa conversa padrão implícita (não
 * quebra quem já despachava sem saber desta Sprint). `clear`/`history` dão à
 * Web acesso a limpar/consultar o histórico de uma conversa.
 */
export const CONVERSATION_COMMANDS = {
  sendMessage: 'conversation.sendMessage',
  sendMessageStream: 'conversation.sendMessageStream',
  cancelStream: 'conversation.cancelStream',
  clear: 'conversation.clear',
  history: 'conversation.history',
} as const;

export type FileAttachment = FileAttachmentType;

export interface SendMessagePayload {
  text: string;
  /** Conversa a que esta mensagem pertence (Sprint 18). Ausente = conversa padrão implícita. */
  conversationId?: string;
}

export interface SendMessageResult {
  reply: string;
}

export interface SendMessageStreamPayload {
  text: string;
  /** Correlação opcional vinda de quem despachou (ex.: a Web, para poder cancelar por id depois). Se ausente, o Service gera um. */
  id?: string;
  /** Conversa a que esta mensagem pertence (Sprint 18). Ausente = conversa padrão implícita. */
  conversationId?: string;
  /** Arquivos anexados (imagens, documentos) para suporte multimodal. */
  files?: FileAttachment[];
}

export interface SendMessageStreamResult {
  id: string;
  reply: string;
}

export interface CancelStreamPayload {
  id: string;
}

export interface ClearConversationPayload {
  conversationId: string;
}

export interface ConversationHistoryPayload {
  conversationId: string;
}

export interface ConversationHistoryResult {
  conversationId: string;
  messages: readonly ConversationMemoryMessage[];
}
