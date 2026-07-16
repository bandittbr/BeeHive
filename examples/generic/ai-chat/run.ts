// BeeHive AI Chat Example
// Executar: pnpm example:ai-chat
//
// Este exemplo demonstra:
// 1. Boot do Kernel
// 2. Bootstrap do ProviderRegistry com OpenRouter
// 3. ProviderRouter substituindo MockProvider
// 4. Execução de chat.generate com provider real
//
// Requisitos:
// - export OPENROUTER_API_KEY=sk-or-v1-...
// - ou configurar em beehive.config.json

import { Kernel } from '../../kernel/Kernel';
import { ProviderRegistry } from '../../runtime/provider-registry';
import { ProviderRouter } from '../../runtime/provider-router';
import { bootstrapProviderRegistry } from '../../runtime/provider-config';
import { OpenRouterProvider } from '../../providers/ai/openrouter/OpenRouterProvider';
import { MockProvider } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  BeeHive AI Chat');
  console.log('  ===============');
  console.log();

  // 1. Boot Kernel
  const kernel = new Kernel();
  await kernel.boot();
  console.log('  Kernel booted');

  // 2. Check environment
  const apiKey = process.env.OPENROUTER_API_KEY;
  const useOpenRouter = !!apiKey;

  if (useOpenRouter) {
    console.log('  Provider: OpenRouter (real API)');
  } else {
    console.log('  Provider: Mock (set OPENROUTER_API_KEY for real AI)');
  }
  console.log();

  // 3. Create and bootstrap ProviderRegistry
  const providerRegistry = new ProviderRegistry();
  bootstrapProviderRegistry(providerRegistry);

  if (useOpenRouter) {
    // Register OpenRouter if API key is available
    const orProvider = new OpenRouterProvider({ model: 'meta-llama/llama-3-8b-instruct:free' });
    providerRegistry.register(orProvider);
  }

  // 4. Wrap capabilities with ProviderRouter
  const router = new ProviderRouter(providerRegistry, kernel.capabilities);
  router.wrapAll();

  // 5. Execute chat.generate
  const cap = kernel.capabilities.resolve('chat.generate');
  const ctx = {
    correlationId: 'ai-chat-example',
    logger: {
      info: (msg: string) => console.log('    ' + msg),
      warn: () => {},
      error: () => {},
    },
    events: { publish: () => {} },
  };

  const question = process.argv[2] || 'Explique computação quântica em uma frase';
  console.log('  Pergunta: "' + question + '"');
  console.log();

  const result = await cap.execute({ message: question }, ctx);

  if (result.success) {
    console.log('  Resposta:');
    console.log();
    const response = result.outputs.response as string;
    // Print response with word wrapping
    const lines = response.match(/.{1,80}/g) || [];
    for (const line of lines) {
      console.log('    ' + line);
    }
    console.log();
    console.log('  Provider: ' + (useOpenRouter ? 'openrouter' : 'mock'));
    console.log('  Duration: ' + result.metrics.duration + 'ms');
  } else {
    console.log('  Error: ' + result.error);
  }

  // Cleanup
  router.restoreAll();
  await kernel.shutdown();
  console.log();
}

main().catch(console.error);
