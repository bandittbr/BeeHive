/**
 * Entrypoint para browser (apps/web).
 *
 * Só exporta tipos e valores leves que NÃO dependem de Node.js.
 * Qualquer coisa que importe `node:*`, `better-sqlite3` ou `fs`
 * DEVE ficar fora daqui.
 */

// Tipos do kernel (leves, sem dependências Node)
export type {
  Command,
  CommandHandler,
  IConfigurationManager,
  ICommandDispatcher,
  IEventBus,
  ILogger,
  IModule,
  IModuleLoader,
  IServiceRegistry,
  KernelContext,
  LogEntry,
  LogLevel,
  Unsubscribe,
} from './kernel/types';

// Tipos de AI (leves)
export type {
  AIProvider,
  AIProviderCapability,
  AIProviderHealth,
  AIProviderSnapshot,
  ChatMessage,
  ChatRequestOptions,
  ChatResponse,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  ProviderConfig,
  StreamChunk,
} from './ai/types';

// Tipos do runtime
export type {
  RuntimeHealth,
  RuntimeSnapshot,
  RuntimeStatus,
} from './runtime/types';

// IDs (constantes simples, sem dependências)
export { AI_MANAGER_ID, TOOL_MANAGER_ID } from './runtime/ids';

// Comandos e eventos da conversa (contratos, sem dependências Node)
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

export type { ConversationMemoryMessage } from './modules/conversation/ConversationMemory';

// Tipos de eventos
export type { BeeHiveEvent, EventName } from './kernel/types';
