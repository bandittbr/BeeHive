import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { IProviderRegistry, IProvider } from '@beehive/sdk';
import { MockProvider } from '@beehive/sdk';
import { OpenRouterProvider } from '../../providers/ai/openrouter/OpenRouterProvider';

export interface ProviderConfig {
  providers: {
    [category: string]: {
      default: string;
      available?: string[];
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

  // Always register mock provider (baseline)
  const mock = new MockProvider();
  registry.register(mock);

  // Register real providers based on config
  const aiConfig = cfg.providers.ai;
  if (aiConfig) {
    // Check each available provider
    const available = aiConfig.available || ['mock'];

    for (const providerId of available) {
      if (providerId === 'mock') continue; // already registered

      if (providerId === 'openrouter') {
        const chatConfig = aiConfig['chat.generate'];
        if (typeof chatConfig === 'object' && chatConfig.provider === 'openrouter') {
          const model = chatConfig.model || 'meta-llama/llama-3-8b-instruct:free';
          registry.register(new OpenRouterProvider({ model }));
        }
      }
      // Future: ollama, gemini, openai, anthropic
    }
  }
}
