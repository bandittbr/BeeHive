/**
 * BeeRouter — ponto único de importação.
 */
export { BeeRouter, createBeeRouter } from './BeeRouter';
export { LLMRouter } from './LLMRouter';
export { classifyError, extractHttpStatus } from './errorClassifier';
export type {
  BeeRouterOptions,
  BeeRouterSnapshot,
  ProviderConfig,
  ProviderCategory,
  Combo,
  ComboModel,
  ClassifiedError,
  RateLimitBucket,
  BackoffState,
} from './types';
