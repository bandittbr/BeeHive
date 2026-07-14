/**
 * Server/Node.js-specific exports for @beehive/platform.
 *
 * This entry point contains code that uses Node.js built-in modules
 * (like node:crypto, node:fs, node:os) and should ONLY be imported
 * in Node.js environments (apps/api, scripts, tests).
 *
 * DO NOT import this in browser/web code (apps/web).
 */
export {
  ProviderCredentialsStore,
  type StoredCredentials,
  type CredentialMeta,
} from '../ai/providers/credentialsStore';
export {
  ProviderManager,
  type ProviderManagerOptions,
  type ProviderDescriptor,
  type ProviderHealthEntry,
  type ProviderManagerHealth,
  type ProviderManagerSnapshot,
  type ProviderChangedPayload,
} from '../ai/ProviderManager';
export { DatabaseManager, type DatabaseManagerOptions } from '../database/DatabaseManager';
export {
  registerProviderCommands,
  PROVIDER_COMMANDS,
} from '../ai/commands';
export {
  createStorage,
  S3Storage,
  LocalStorage,
  type StorageConfig,
  type IStorage,
  type UploadResult,
} from '../storage';