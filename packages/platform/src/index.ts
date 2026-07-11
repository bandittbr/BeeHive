/**
 * @beehive/platform — ponto único de importação da plataforma.
 *
 * Reúne Kernel, Module System, Service Layer, AI Layer, Tool System e Runtime
 * (Sprints 6–11), extraídos de `apps/web` nesta Sprint 12 para um pacote
 * compartilhado. É agnóstico de ambiente: o mesmo código roda hospedado em
 * `apps/api` (Node, como processo do Runtime) e é referenciado por `apps/web`
 * (hoje, majoritariamente por tipos/contratos — a Web virou cliente remoto).
 *
 * IMPORTANTE (desde a Sprint 15.0, quando a primeira Tool real ganhou uma
 * dependência Node nativa — `FilesystemTool` usa `node:fs`): `./tools` e
 * `./runtime` são reexportados aqui SÓ COMO TIPOS (`export type *`). Em ESM
 * nativo (como o Vite serve em dev, sem bundling), um `export { X } from
 * './y'` de VALOR força a avaliação inteira do módulo `./y` — mesmo que o
 * navegador nunca use `X` — e `runtime/RuntimeManager.ts` importa o Tool
 * System inteiro (para poder instanciá-lo), o que quebra o bundle do
 * navegador com "node:fs has been externalized". `export type` não sofre
 * disso: é apagado por completo na transpilação, nunca vira um import real.
 * Quem precisar do valor `RuntimeManager` (só `apps/api`, Node) importa de
 * `@beehive/platform/runtime` — um subpath dedicado (ver `package.json`).
 */
export * from './kernel';
export * from './modules';
export * from './services';
export * from './ai';
export * from './database';
export type * from './tools';
export type * from './runtime';
// Valores (não só tipos) — direto de `./runtime/ids`, que NÃO importa nada
// (ao contrário de `./runtime`, cujo barrel também reexporta `RuntimeManager`
// e arrastaria o Tool System/`node:fs` para o navegador).
export { AI_MANAGER_ID, TOOL_MANAGER_ID } from './runtime/ids';

// Vocabulário do módulo Conversa (comandos/eventos) — usado pelo cliente Web
// para tipar o que despacha/escuta no Runtime remoto, sem reimplementar nada.
export {
  CONVERSATION_COMMANDS,
  type SendMessagePayload,
  type SendMessageResult,
  type SendMessageStreamPayload,
  type SendMessageStreamResult,
  type CancelStreamPayload,
  type ClearConversationPayload,
  type ConversationHistoryPayload,
  type ConversationHistoryResult,
} from './modules/conversation/commands';
export {
  CONVERSATION_EVENTS,
  type MessagePayload,
  type MessageRole,
  type MessageStreamStartedPayload,
  type MessageStreamChunkPayload,
  type MessageStreamCompletedPayload,
  type MessageStreamFailedPayload,
  type ConversationHistoryClearedPayload,
  type ConversationHistoryUpdatedPayload,
} from './modules/conversation/events';
// Só o FORMATO de uma mensagem guardada (role/content/timestamp) — não a
// classe `ConversationMemory` nem como ela funciona (limite, Map interno
// etc.), que continuam exclusivos do módulo Conversa. Necessário aqui só
// porque `ConversationHistoryResult.messages` (acima) usa este tipo.
export type { ConversationMemoryMessage } from './modules/conversation/ConversationMemory';
