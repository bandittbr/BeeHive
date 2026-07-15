/**
 * Tipos compartilhados do módulo Conversa.
 * Mantidos aqui para evitar dependências circulares entre commands.ts e ConversationMemory.ts
 */

/** Anexo de arquivo para mensagens multimodais (imagens, PDFs, código, etc.). */
export interface FileAttachment {
  /** Nome original do arquivo. */
  name: string;
  /** MIME type (ex.: image/png, application/pdf, text/plain). */
  type: string;
  /** Tamanho em bytes. */
  size: number;
  /** Conteúdo do arquivo como base64 data URI (para imagens) ou texto. */
  content: string;
}