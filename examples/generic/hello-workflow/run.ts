// BeeHive Example: hello-workflow
// Uso: npx tsx examples/hello-workflow/run.ts
//
// Workflow mais simples possivel: uma unica capability chat.generate
// Demonstra: boot, mock, workflow, execucao, resultado

import { Kernel } from '../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   BeeHive Example: hello-workflow');
  console.log('  ═══════════════════════════════════════');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const mocks = MockAdapter.for(kernel);
  mocks.mock('chat.generate');

  const workflow = WorkflowBuilder.create('hello', 'Hello World')
    .describe('Ola mundo — demonstra o workflow mais simples possivel')
    .onManual()
    .step('greet', 'chat.generate', { message: 'Diga ola para {{input.name}}' }, 'response')
    .addOutput('greeting', '{{response.response}}')
    .build();

  console.log('  Workflow: ' + workflow.name);
  console.log('  Steps:    ' + workflow.steps.length + ' (' + workflow.steps.map((s: any) => s.capability).join(' → ') + ')');
  console.log();

  kernel.workflows.register(workflow as any);

  const instance = await kernel.workflows.start('hello', { name: 'Mundo' });

  console.log('  Status:   ' + instance.status);
  console.log('  Duration: ' + ((instance.completedAt || 0) - instance.startedAt) + 'ms');
  console.log();
  if (instance.stepResults) {
    for (const [key, val] of Object.entries(instance.stepResults)) {
      const preview = JSON.stringify(val).slice(0, 140);
      console.log('  [' + key + '] ' + preview);
    }
  }
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   Exemplo concluido. Status: ' + instance.status);
  console.log('  ═══════════════════════════════════════');
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
