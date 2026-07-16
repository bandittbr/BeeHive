import type { ILogger } from './logger';
import type { IEventBus } from './events';

export type ProviderPolicy = {
  priority?: 'cost' | 'speed' | 'quality';
  fallback?: string[];
};

export type ProviderReadiness =
  | { status: 'ready' }
  | { status: 'degraded'; reason: string; fix?: string }
  | { status: 'unavailable'; reason: string; fix?: string };

export type ProviderHealth =
  | { status: 'healthy'; latency: number }
  | { status: 'degraded'; latency: number; reason: string }
  | { status: 'error'; latency: number; reason: string };

export interface IProvider {
  readonly id: string;
  readonly type: string; // 'ai' | 'browser' | 'storage' | 'mock'
  readonly name: string;
  readonly capabilities: string[]; // lista de capability ids que este provider atende

  execute(capabilityId: string, params: Record<string, unknown>, ctx: { logger: ILogger; events: IEventBus }): Promise<{ success: boolean; outputs: Record<string, unknown>; error?: string; metrics: { duration: number } }>;

  readiness(): ProviderReadiness | Promise<ProviderReadiness>;
  health(): ProviderHealth | Promise<ProviderHealth>;
}

export interface IProviderRegistry {
  register(provider: IProvider): void;
  unregister(providerId: string): void;
  resolve(capabilityId: string, policy?: ProviderPolicy): IProvider | undefined;
  list(): IProvider[];
  listByType(type: string): IProvider[];
}
