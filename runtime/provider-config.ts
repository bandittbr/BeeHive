import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { IProviderRegistry, IProvider } from '@beehive/sdk';
import { MockProvider } from '@beehive/sdk';

export interface ProviderConfig {
  providers: {
    [category: string]: {
      default: string;
      [capabilityId: string]: {
        provider: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
      } | string;
    };
  };
}

const CONFIG_PATH = join(process.cwd(), 'beehive.config.json');

export function loadProviderConfig(): ProviderConfig {
  if (!existsSync(CONFIG_PATH)) {
    return {
      providers: {
        ai: { default: 'mock' },
        browser: { default: 'mock' },
      },
    };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      providers: {
        ai: { default: 'mock' },
        browser: { default: 'mock' },
      },
    };
  }
}

export function bootstrapProviderRegistry(registry: IProviderRegistry, config?: ProviderConfig): void {
  const cfg = config ?? loadProviderConfig();

  // Always register mock provider
  const mock = new MockProvider();
  registry.register(mock);

  // Future: register real providers based on config
  // e.g., if cfg.providers.ai.default === 'openrouter':
  //   registry.register(new OpenRouterProvider(cfg.providers.ai['chat.generate']));

  // Apply defaults: for each category, wire capabilities to the default provider
  for (const [category, settings] of Object.entries(cfg.providers)) {
    const defaultProvider = settings.default;
    if (defaultProvider === 'mock') continue; // already registered

    // Future: registry.register(new <Provider>(defaultProvider));
  }
}
