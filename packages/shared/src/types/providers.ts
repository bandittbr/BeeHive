import type { AICapability } from './ai';

export interface ProviderCredentials {
  id: string;
  name: string;
  providerType: string;
  apiKey: string;
  baseUrl?: string;
  models: string[];
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  website: string;
  apiKeyUrl: string;
  docsUrl: string;
  baseUrl: string;
  models: ModelDefinition[];
  defaultModel: string;
  capabilities: AICapability[];
  priority: number;
  isFree?: boolean;
}

export interface ModelDefinition {
  id: string;
  name: string;
  capabilities: AICapability[];
  contextLength?: number;
  pricing?: {
    input: number;
    output: number;
    currency: string;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  model?: string;
  error?: string;
}

export interface ProviderCriteria {
  provider?: string;
  model?: string;
  capabilities?: AICapability[];
}

export interface IProviderManager {
  registerProvider(provider: {
    id: string;
    name: string;
    apiKey: string;
    baseUrl?: string;
    models: string[];
    capabilities: AICapability[];
    priority?: number;
  }): Promise<void>;

  unregisterProvider(providerId: string): Promise<void>;

  getProvider(providerId: string): ProviderCredentials | undefined;
  listProviders(): ProviderCredentials[];
  listModels(filter?: { provider?: string; capability?: AICapability }): ModelDefinition[];

  resolve(criteria: ProviderCriteria): Promise<any>;
  testConnection(providerId: string): Promise<ConnectionTestResult>;

  setActive(providerId: string, active: boolean): Promise<void>;
  setPriority(providerId: string, priority: number): Promise<void>;
}
