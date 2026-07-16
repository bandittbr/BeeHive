import type { ILogger } from './logger';
import type { IEventBus } from './events';
import type { IProviderRegistry } from './providers';

export interface ICapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputs: CapabilityInput[];
  readonly outputs: CapabilityOutput[];
  readonly tags: string[];
  readonly version?: string;
  execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult>;
}

export interface CapabilityInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface CapabilityOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'object' | 'array';
  description: string;
}

export interface ExecutionContext {
  correlationId: string;
  userId?: string;
  workspaceId?: string;
  logger: ILogger;
  events: IEventBus;
  providers?: IProviderRegistry;
  abortSignal?: AbortSignal;
}

export interface CapabilityResult {
  success: boolean;
  outputs: Record<string, unknown>;
  error?: string;
  metrics: { duration: number; tokensUsed?: number; cost?: number };
}

export interface ICapabilityRegistry {
  register(pluginId: string, capability: ICapability): void;
  unregister(pluginId: string, capabilityId: string): void;
  find(query: string): ICapability[];
  resolve(capabilityId: string): ICapability;
  list(): CapabilityEntry[];
  searchByTag(tag: string): ICapability[];
}

export interface CapabilityEntry {
  pluginId: string;
  capability: ICapability;
}

