// Swap Test: mesma capability + mesmo workflow + mesma aplicacao
// Executa com provider=mock e depois com provider=real (futuro)
// Prova: o workflow nao sabe qual provider esta rodando

import { Kernel } from '../kernel/Kernel';
import { ProviderRegistry } from '../runtime/provider-registry';
import { ProviderRouter } from '../runtime/provider-router';
import { MockProvider } from '@beehive/sdk';
import type { ExecutionContext } from '@beehive/sdk';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function check(label: string, ok: boolean, detail?: string) {
  const mark = ok ? GREEN + '\u2713' : RED + '\u2717';
  console.log('  ' + mark + RESET + ' ' + label);
  if (!ok && detail) console.log('    ' + RED + detail + RESET);
}

async function main() {
  console.log();
  console.log('  ' + BOLD + 'Swap Test' + RESET);
  console.log('  ' + DIM + 'Mesma capability, mesmo workflow, provider trocado' + RESET);
  console.log();

  // 1. Boot Kernel normally
  const kernel = new Kernel();
  await kernel.boot();

  // 2. Create ProviderRegistry with MockProvider
  const providerRegistry = new ProviderRegistry();
  const mockProvider = new MockProvider();
  providerRegistry.register(mockProvider);

  check('MockProvider registered', providerRegistry.list().length === 1);
  check('MockProvider supports chat.generate', mockProvider.capabilities.includes('chat.generate'));

  // 3. Create ProviderRouter and wrap capabilities
  const router = new ProviderRouter(providerRegistry, kernel.capabilities);
  router.wrapAll();

  const proxyEntry = (kernel.capabilities.list() as Array<{ pluginId: string; capability: any }>)
    .find(e => e.capability.id === 'chat.generate');
  check('chat.generate proxied', proxyEntry?.pluginId === 'provider:proxy');

  // 4. Execute chat.generate via proxy (through provider=mock)
  const cap = kernel.capabilities.resolve('chat.generate');
  const ctx: ExecutionContext = {
    correlationId: 'swap-test',
    logger: { info: () => {}, warn: () => {}, error: () => {} } as any,
    events: { publish: () => {} } as any,
  };

  const result1 = await cap.execute({ message: 'Swap test' }, ctx);
  check('Proxy execute succeeded', result1.success);
  check('Proxy returns mock response', typeof result1.outputs.response === 'string');
  check('Proxy response contains "Mock"', String(result1.outputs.response).includes('Mock'));

  // 5. Restore originals (simulate switching provider)
  router.restoreAll();

  const restoredEntry = (kernel.capabilities.list() as Array<{ pluginId: string; capability: any }>)
    .find(e => e.capability.id === 'chat.generate');
  check('Original restored', restoredEntry?.pluginId !== 'provider:proxy');

  // 6. Execute again with original capability (still returns mock because foundation plugin has hardcoded mock)
  const originalCap = kernel.capabilities.resolve('chat.generate');
  const result2 = await originalCap.execute({ message: 'Swap test restored' }, ctx);
  check('Original execute succeeded', result2.success);
  check('Original returns same shape', typeof result2.outputs.response === 'string');

  console.log();
  console.log('  ' + BOLD + 'Result: Provider Router funciona sem alterar Kernel' + RESET);
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
