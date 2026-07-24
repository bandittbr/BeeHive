// BeeHive Event Inspector
// Uso: npx tsx tools/event-inspector.ts
//
// Assina todos os eventos do EventBus e exibe em tempo real.
// Mostra a árvore de causalidade: qual evento causou qual.

import { Kernel } from '../kernel/Kernel';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(11, 23);
}

async function inspect() {
  console.log();
  console.log('  ====================================');
  console.log('   BeeHive Event Inspector');
  console.log('  ====================================');
  console.log('   Assinando todos os eventos...');
  console.log('   (pressione Ctrl+C para sair)');
  console.log('  ====================================');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  // Subscribe to all events
  const sub = kernel.events.subscribe('*', async (event: any) => {
    const ts = formatTimestamp(event.timestamp);
    const source = (event.source ?? '?').padEnd(20);
    const type = (event.type ?? '?').padEnd(25);
    const payload = JSON.stringify(event.payload ?? {}).slice(0, 80);

    console.log(`   [${ts}] ${source} ${type} ${payload}`);
  });

  console.log('   Listening...');
  console.log();

  // Keep alive until Ctrl+C
  await new Promise(() => {});
}

inspect().catch(console.error);
