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
export * from './providers/anthropic';
export * from './providers/gemini';
export {
  PROVIDER_CATALOG,
  BIGPICKLE_DEFAULT_MODEL,
  getCatalogEntry,
  getCatalogByTier,
  type ProviderCatalogEntry,
  type CredentialField,
  type ProviderImplementation,
} from './providers/catalog';
export { PROVIDER_COMMANDS, registerProviderCommands } from './commands';
export * from './router';
