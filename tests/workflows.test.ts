// BeeHive Workflow Integration Tests
// Uso: npx tsx tests/workflows.test.ts
//
// Executa todos os exemplos de workflow com mocks
// e verifica se cada um completa com sucesso

import { Kernel } from '../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

let passed = 0;
let failed = 0;

function assert(ok: boolean, message: string) {
  if (ok) {
    console.log('  \u2713 ' + message);
    passed++;
  } else {
    console.log('  \u2717 ' + message);
    failed++;
  }
}

async function test(workflowId: string, workflow: any, input: Record<string, unknown>): Promise<void> {
  console.log();
  console.log('  [' + workflowId + '] ' + workflow.name);

  const kernel = new Kernel();
  await kernel.boot();
  const mocks = MockAdapter.for(kernel);
  mocks.mockAll();

  const steps = workflow.steps.map((s: any) => s.capability || s.type);
  console.log('    Steps: ' + steps.join(' → '));

  kernel.workflows.register(workflow);

  try {
    const instance = await kernel.workflows.start(workflowId, input);
    assert(instance.status === 'completed', 'status=' + instance.status);
    const dur = (instance.completedAt || 0) - instance.startedAt;
    console.log('    Duration: ' + dur + 'ms');
    if (instance.stepResults) {
      assert(Object.keys(instance.stepResults).length > 0, 'artifacts: ' + Object.keys(instance.stepResults).join(', '));
    }
  } catch (e: any) {
    assert(false, 'exception: ' + e.message);
  }

  await kernel.shutdown();
}

async function main() {
  console.log();
  console.log('  ====================================');
  console.log('   BeeHive Workflow Tests');
  console.log('  ====================================');

  // Test 1: hello-workflow
  await test('hello', WorkflowBuilder.create('hello', 'Hello World')
    .onManual()
    .step('greet', 'chat.generate', { message: 'Ola {{input.name}}' }, 'response')
    .addOutput('result', '{{response.response}}')
    .build() as any,
    { name: 'Mundo' },
  );

  // Test 2: summarize-website
  await test('summarize', WorkflowBuilder.create('summarize', 'Summarize Website')
    .onManual()
    .step('scrape', 'browser.scrape', { url: '{{input.url}}' }, 'page')
    .step('summarize', 'chat.generate', { message: 'Resuma: {{page.markdown}}' }, 'summary')
    .addOutput('result', '{{summary.response}}')
    .build() as any,
    { url: 'https://example.com' },
  );

  // Test 3: youtube-script
  await test('youtube-script', WorkflowBuilder.create('youtube-script', 'YouTube Script')
    .onManual()
    .step('script', 'chat.generate', { message: 'Roteiro sobre {{input.topic}}' }, 'script')
    .step('title', 'chat.generate', { message: 'Titulos sobre {{input.topic}}' }, 'titles')
    .step('description', 'chat.generate', { message: 'Descricao sobre {{input.topic}}' }, 'description')
    .addOutput('script', '{{script.response}}')
    .build() as any,
    { topic: 'inteligencia artificial', tone: 'educativo' },
  );

  // Test 4: daily-news
  await test('daily-news', WorkflowBuilder.create('daily-news', 'Daily News')
    .onManual()
    .step('tech', 'chat.generate', { message: 'Noticias tech de {{input.date}}' }, 'tech')
    .step('business', 'chat.generate', { message: 'Noticias business de {{input.date}}' }, 'business')
    .step('science', 'chat.generate', { message: 'Noticias ciencia de {{input.date}}' }, 'science')
    .addOutput('briefing', 'Briefing {{input.date}}')
    .build() as any,
    { date: '15/07/2026' },
  );

  // Test 5: research-company
  await test('research-company', WorkflowBuilder.create('research-company', 'Company Research')
    .onManual()
    .step('overview', 'chat.generate', { message: 'Visao geral de {{input.company}}' }, 'overview')
    .step('swot', 'chat.generate', { message: 'SWOT de {{input.company}}' }, 'swot')
    .step('competitors', 'chat.generate', { message: 'Concorrentes de {{input.company}}' }, 'competitors')
    .addOutput('report', 'Relatorio {{input.company}}')
    .build() as any,
    { company: 'Acme Corp', industry: 'technology' },
  );

  // Test 6: condition workflow (if/else)
  await test('conditional', WorkflowBuilder.create('conditional', 'Conditional Greeting')
    .onManual()
    .condition('check', '{{input.lang === \"pt\"}}', [
      { id: 'pt', type: 'capability', capability: 'chat.generate', input: { message: 'Diga ola em portugues' }, output: 'greeting' } as any,
    ], [
      { id: 'en', type: 'capability', capability: 'chat.generate', input: { message: 'Say hello in english' }, output: 'greeting' } as any,
    ])
    .addOutput('result', '{{greeting.response}}')
    .build() as any,
    { lang: 'pt' },
  );

  // Test 7: foreach workflow
  await test('foreach', WorkflowBuilder.create('foreach', 'Foreach Example')
    .onManual()
    .foreach('loop', '{{input.items}}', [
      { id: 'process', type: 'capability', capability: 'chat.generate', input: { message: 'Process {{item}}' }, output: 'processed' } as any,
    ])
    .build() as any,
    { items: JSON.stringify(['a', 'b', 'c']) },
  );

  // Summary
  const total = passed + failed;
  console.log();
  console.log('  ====================================');
  console.log('   Results: ' + passed + ' passed, ' + failed + ' failed of ' + total);
  console.log('  ====================================');
  console.log();

  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
