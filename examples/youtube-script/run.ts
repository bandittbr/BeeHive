// BeeHive Example: youtube-script
// Uso: npx tsx examples/youtube-script/run.ts
//
// Gera um roteiro de video para YouTube usando chat.generate
// Demonstra: workflow com template complexo e output estruturado

import { Kernel } from '../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   BeeHive Example: youtube-script');
  console.log('  ═══════════════════════════════════════');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const mocks = MockAdapter.for(kernel);
  mocks.mock('chat.generate');

  const workflow = WorkflowBuilder.create('youtube-script', 'YouTube Script')
    .describe('Gera roteiro completo para video do YouTube baseado em tema')
    .onManual()
    .step('script', 'chat.generate', {
      message: 'Crie um roteiro detalhado para um video do YouTube sobre: {{input.topic}}.\n\n'
        + 'Formato:\n'
        + '- Introducao (30s)\n'
        + '- Conteudo principal (5 min)\n'
        + '- Conclusao (30s)\n'
        + '- Call to action\n\n'
        + 'Tom: {{input.tone}}',
    }, 'script')
    .step('title', 'chat.generate', {
      message: 'Sugira 5 titulos atraentes para um video do YouTube sobre: {{input.topic}}. Apenas os titulos, um por linha.',
    }, 'titles')
    .step('description', 'chat.generate', {
      message: 'Escreva uma descricao otimizada para SEO para um video do YouTube sobre: {{input.topic}}.\n'
        + 'Inclua hashtags e timestamps.',
    }, 'description')
    .addOutput('script', '{{script.response}}')
    .addOutput('titles', '{{titles.response}}')
    .addOutput('description', '{{description.response}}')
    .build();

  console.log('  Workflow: ' + workflow.name);
  console.log('  Steps:    ' + workflow.steps.length + ' (' + workflow.steps.map((s: any) => s.capability).join(' → ') + ')');
  console.log();

  kernel.workflows.register(workflow as any);

  const instance = await kernel.workflows.start('youtube-script', {
    topic: 'Como estudar para a OAB em 3 meses',
    tone: 'didatico e motivacional',
  });

  console.log('  Status:   ' + instance.status);
  console.log('  Duration: ' + ((instance.completedAt || 0) - instance.startedAt) + 'ms');
  console.log();
  if (instance.stepResults) {
    for (const [key, val] of Object.entries(instance.stepResults)) {
      const preview = JSON.stringify(val).slice(0, 250);
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
