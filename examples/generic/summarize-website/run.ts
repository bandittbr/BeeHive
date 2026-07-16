// BeeHive Example: summarize-website
// Uso: npx tsx examples/summarize-website/run.ts
//
// Encadeia browser.scrape → chat.generate
// Navega para uma URL, extrai o conteudo e resume com IA
// Demonstra: encadeamento de 2 capabilities, passagem de output entre steps

import { Kernel } from '../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   BeeHive Example: summarize-website');
  console.log('  ═══════════════════════════════════════');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const mocks = MockAdapter.for(kernel);
  mocks.mock('browser.scrape');
  mocks.mock('chat.generate');

  const workflow = WorkflowBuilder.create('summarize', 'Summarize Website')
    .describe('Extrai o conteudo de uma URL e resume com IA')
    .onManual()
    .step('scrape', 'browser.scrape', { url: '{{input.url}}' }, 'page')
    .step('summarize', 'chat.generate', {
      message: 'Resuma o conteudo abaixo em 3 paragrafos:\n\n{{page.markdown}}',
    }, 'summary')
    .addOutput('result', '# Resumo: {{input.url}}\n\n{{summary.response}}')
    .build();

  console.log('  Workflow: ' + workflow.name);
  console.log('  Steps:    ' + workflow.steps.length + ' (' + workflow.steps.map((s: any) => s.capability).join(' → ') + ')');
  console.log();

  kernel.workflows.register(workflow as any);

  const instance = await kernel.workflows.start('summarize', { url: 'https://example.com' });

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
  console.log('  Flow: browser.scrape ──> chat.generate');
  console.log('  Output de scrape vira input de summarize via {{page.markdown}}');
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   Exemplo concluido. Status: ' + instance.status);
  console.log('  ═══════════════════════════════════════');
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
