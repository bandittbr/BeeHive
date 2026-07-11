/**
 * AI Layer do BeeHive — ponto único de importação.
 *
 * Toda IA do sistema passa por aqui: contratos, base de provedor, registro,
 * o gerenciador — e, a partir da Sprint 13, o primeiro provedor real
 * (`OllamaProvider`, capacidade `chat`) e o `ProviderManager`.
 */
export * from './types';
export { BaseAIProvider } from './BaseAIProvider';
export { AIProviderRegistry } from './AIProviderRegistry';
export { AIManager, type AIManagerDeps, type AIExecuteInit } from './AIManager';
// AI_MANAGER_ID NÃO é reexportado por aqui: `runtime/RuntimeManager.ts` já expõe
// uma constante de mesmo nome/valor pelo barrel `./runtime`, e `src/index.ts`
// faz `export *` dos dois — reexportar aqui geraria um TS2308 (ambiguidade) no
// pacote sem tocar em Runtime. Quem precisar do id canônico do AIManager fora
// deste diretório importa direto de `./ai/AIManager` (ver `ConversationService`).
export {
  ProviderManager,
  type ProviderManagerOptions,
  type ProviderDescriptor,
  type ProviderHealthEntry,
  type ProviderManagerHealth,
  type ProviderManagerSnapshot,
  type ProviderChangedPayload,
} from './ProviderManager';
export * from './providers/ollama';
export * from './providers/openai';
export * from './router';
