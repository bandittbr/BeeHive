// BeeHive Example: daily-news
// Uso: npx tsx examples/daily-news/run.ts
//
// Gera um resumo de noticias em categorias usando chat.generate
// Demonstra: multiplos steps paralelos (conceitualmente), output aggregation

import { Kernel } from '../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   BeeHive Example: daily-news');
  console.log('  ═══════════════════════════════════════');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const mocks = MockAdapter.for(kernel);
  mocks.mock('chat.generate');

  const workflow = WorkflowBuilder.create('daily-news', 'Daily News Briefing')
    .describe('Gera um resumo de noticias em 3 categorias')
    .onManual()
    .step('tech', 'chat.generate', {
      message: 'Resuma as principais noticias de tecnologia de {{input.date}} em 3 topicos.',
    }, 'tech')
    .step('business', 'chat.generate', {
      message: 'Resuma as principais noticias de negocios de {{input.date}} em 3 topicos.',
    }, 'business')
    .step('science', 'chat.generate', {
      message: 'Resuma as principais noticias de ciencia de {{input.date}} em 3 topicos.',
    }, 'science')
    .addOutput('briefing',
      '# Briefing Diario: {{input.date}}\n\n'
      + '## Tecnologia\n{{tech.response}}\n\n'
      + '## Negocios\n{{business.response}}\n\n'
      + '## Ciencia\n{{science.response}}')
    .build();

  console.log('  Workflow: ' + workflow.name);
  console.log('  Steps:    ' + workflow.steps.length + ' (' + workflow.steps.map((s: any) => s.capability).join(' → ') + ')');
  console.log();

  kernel.workflows.register(workflow as any);

  const instance = await kernel.workflows.start('daily-news', { date: '15/07/2026' });

  console.log('  Status:   ' + instance.status);
  console.log('  Duration: ' + ((instance.completedAt || 0) - instance.startedAt) + 'ms');
  console.log();
  if (instance.stepResults) {
    for (const [key, val] of Object.entries(instance.stepResults)) {
      const preview = JSON.stringify(val).slice(0, 200);
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
