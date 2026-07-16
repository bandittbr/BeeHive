export interface IProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  readonly models: string[];

  connect(config: ProviderConfig): Promise<boolean>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  isConnected(): boolean;
}

export type ProviderType = 'ai' | 'browser' | 'storage' | 'embedding' | 'search';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  options?: Record<string, unknown>;
}

export interface IProviderManager {
  register(provider: IProvider): Promise<void>;
  unregister(providerId: string): Promise<void>;
  get(providerId: string): IProvider | undefined;
  list(type?: ProviderType): IProvider[];
  resolve(criteria: ProviderCriteria): Promise<IProvider>;
}

export interface ProviderCriteria {
  type: ProviderType;
  model?: string;
  capability?: string;
}
