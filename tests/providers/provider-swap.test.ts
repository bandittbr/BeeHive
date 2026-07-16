// Provider Swap Test — Garantia permanente do sistema
//
// Este teste é uma asserção de arquitetura:
// "Nenhum provider pode exigir mudança acima dele."
//
// Se este teste quebrar, a abstração de provider está comprometida.
// Cada nova capability ou provider deve passar neste teste.

import { Kernel } from '../../kernel/Kernel';
import { ProviderRegistry } from '../../runtime/provider-registry';
import { ProviderRouter } from '../../runtime/provider-router';
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
  console.log('  ' + BOLD + 'Provider Swap Test' + RESET);
  console.log('  ' + DIM + 'Mesma capability, mesmo workflow, provider trocado' + RESET);
  console.log();

  let passed = 0;
  let failed = 0;

  function assert(label: string, ok: boolean) {
    const mark = ok ? GREEN + '\u2713' : RED + '\u2717';
    console.log('  ' + mark + RESET + ' ' + label);
    if (ok) passed++; else failed++;
  }

  // 1. Boot Kernel normally
  const kernel = new Kernel();
  await kernel.boot();

  // 2. Create ProviderRegistry with MockProvider
  const providerRegistry = new ProviderRegistry();
  const mockProvider = new MockProvider();
  providerRegistry.register(mockProvider);

  assert('MockProvider registered', providerRegistry.list().length === 1);
  assert('MockProvider supports chat.generate', mockProvider.capabilities.includes('chat.generate'));

  // 3. Create ProviderRouter and wrap capabilities
  const router = new ProviderRouter(providerRegistry, kernel.capabilities);
  router.wrapAll();

  const proxyEntry = (kernel.capabilities.list() as Array<{ pluginId: string; capability: any }>)
    .find(e => e.capability.id === 'chat.generate');
  assert('chat.generate proxied by ProviderRouter', proxyEntry?.pluginId === 'provider:proxy');

  // 4. Execute chat.generate via proxy (through provider=mock)
  const cap = kernel.capabilities.resolve('chat.generate');
  const ctx: ExecutionContext = {
    correlationId: 'swap-test',
    logger: { info: () => {}, warn: () => {}, error: () => {} } as any,
    events: { publish: () => {} } as any,
  };

  const result1 = await cap.execute({ message: 'Swap test' }, ctx);
  assert('Proxy execute succeeded', result1.success);
  assert('Proxy returns mock response', typeof result1.outputs.response === 'string');
  assert('Proxy response contains "Mock"', String(result1.outputs.response).includes('Mock'));

  // 5. Restore originals (simulate switching provider)
  router.restoreAll();

  const restoredEntry = (kernel.capabilities.list() as Array<{ pluginId: string; capability: any }>)
    .find(e => e.capability.id === 'chat.generate');
  assert('Original capability restored', restoredEntry?.pluginId !== 'provider:proxy');

  // 6. Execute again with original capability
  const originalCap = kernel.capabilities.resolve('chat.generate');
  const result2 = await originalCap.execute({ message: 'Swap test restored' }, ctx);
  assert('Original execute succeeded', result2.success);
  assert('Original returns same shape', typeof result2.outputs.response === 'string');

  // 7. Wrap again — idempotent
  router.wrapAll();
  const reProxy = (kernel.capabilities.list() as Array<{ pluginId: string; capability: any }>)
    .find(e => e.capability.id === 'chat.generate');
  assert('Wrap is idempotent', reProxy?.pluginId === 'provider:proxy');

  console.log();
  console.log('  ' + BOLD + '\u2500'.repeat(47) + RESET);
  console.log('  ' + GREEN + passed + RESET + ' passed, ' + (failed > 0 ? RED + failed + RESET : '0'));
  console.log('  ' + DIM + 'Provider Swap Test — arquitetura validada' + RESET);
  console.log();

  await kernel.shutdown();
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
