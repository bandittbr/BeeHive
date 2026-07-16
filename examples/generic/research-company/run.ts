// BeeHive Example: research-company
// Uso: npx tsx examples/research-company/run.ts
//
// Workflow de pesquisa sobre uma empresa: gera analise em 4 categorias
// Demonstra: workflow com template rico e multiplos outputs

import { Kernel } from '../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  ═══════════════════════════════════════');
  console.log('   BeeHive Example: research-company');
  console.log('  ═══════════════════════════════════════');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  const mocks = MockAdapter.for(kernel);
  mocks.mock('chat.generate');

  const workflow = WorkflowBuilder.create('research-company', 'Company Research')
    .describe('Gera uma analise completa de uma empresa para due diligence')
    .onManual()
    .step('overview', 'chat.generate', {
      message: 'Forneca uma visao geral da empresa {{input.company}} que atua no setor de {{input.industry}}.',
    }, 'overview')
    .step('swot', 'chat.generate', {
      message: 'Analise SWOT da empresa {{input.company}}:\n'
        + '- Strengths (Forcas)\n- Weaknesses (Fraquezas)\n'
        + '- Opportunities (Oportunidades)\n- Threats (Ameacas)',
    }, 'swot')
    .step('competitors', 'chat.generate', {
      message: 'Liste e analise os 3 principais concorrentes de {{input.company}} no mercado de {{input.industry}}.',
    }, 'competitors')
    .addOutput('report',
      '# Analise: {{input.company}}\n\n'
      + '## Visao Geral\n{{overview.response}}\n\n'
      + '## SWOT\n{{swot.response}}\n\n'
      + '## Concorrencia\n{{competitors.response}}')
    .build();

  console.log('  Workflow: ' + workflow.name);
  console.log('  Steps:    ' + workflow.steps.length + ' (' + workflow.steps.map((s: any) => s.capability).join(' → ') + ')');
  console.log();

  kernel.workflows.register(workflow as any);

  const instance = await kernel.workflows.start('research-company', {
    company: 'Acme Corp',
    industry: 'technology',
  });

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
