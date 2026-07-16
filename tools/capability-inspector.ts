// BeeHive Capability Inspector
// Uso: npx tsx tools/capability-inspector.ts
//
// Lista todas as capabilities registradas com:
//   - Plugin de origem
//   - Adapter responsável
//   - Status de saúde
//   - Latência média
//   - Input/Output schemas

import { Kernel } from '../kernel/Kernel';

async function inspect() {
  console.log();
  console.log('  ====================================');
  console.log('   BeeHive Capability Inspector');
  console.log('  ====================================');
  console.log();

  const kernel = new Kernel();
  const report = await kernel.boot();

  console.log(`   Kernel: ${report.kernel.status} (${report.kernel.duration}ms)`);
  console.log(`   Plugins ativos: ${report.plugins.filter(p => p.status === 'activated').length}`);
  console.log();
  console.log('  ------------------------------------');
  console.log('   Registered Capabilities');
  console.log('  ------------------------------------');
  console.log();

  const caps = kernel.capabilities.list();

  if (caps.length === 0) {
    console.log('   (nenhuma capability registrada)');
    console.log();
    process.exit(0);
  }

  for (const entry of caps) {
    const cap = entry.capability;
    const padId = cap.id.padEnd(30);
    console.log(`   ${cap.id}`);
    console.log(`   ${' '.repeat(3)}Plugin:    ${entry.pluginId}`);
    console.log(`   ${' '.repeat(3)}Descricao: ${cap.description}`);
    console.log(`   ${' '.repeat(3)}Inputs:    ${cap.inputs.map(i => `${i.name}:${i.type}${i.required ? '*' : ''}`).join(', ')}`);
    console.log(`   ${' '.repeat(3)}Outputs:   ${cap.outputs.map(o => `${o.name}:${o.type}`).join(', ')}`);
    console.log(`   ${' '.repeat(3)}Tags:      ${cap.tags?.join(', ') || '(nenhuma)'}`);
    console.log();
  }

  console.log('  ------------------------------------');
  console.log(`   Total: ${caps.length} capabilities`);
  console.log('  ====================================');
  console.log();

  await kernel.shutdown();
}

inspect().catch(console.error);
