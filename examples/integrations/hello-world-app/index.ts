// Hello World Application
// Uma aplicacao externa que usa o BeeHive sem importar o Kernel.
// Prova: um terceiro consegue construir sobre BeeHive com apenas o SDK.

import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';
import { Kernel } from '../../../kernel/Kernel';

class HelloWorldApp {
  private kernel: Kernel;

  async start(): Promise<void> {
    console.log();
    console.log('  Hello World Application');
    console.log('  -----------------------');
    console.log('  Esta aplicacao usa BeeHive sem modifica-lo.');
    console.log();

    // 1. Boot Kernel (unica dependencia — igual para toda aplicacao)
    this.kernel = new Kernel();
    await this.kernel.boot();

    // 2. Mock capabilities (sem API externa)
    const mocks = MockAdapter.for(this.kernel);
    mocks.mock('chat.generate');

    // 3. Criar workflow com SDK (sem importar kernel/)
    const greeting = this.buildGreetingWorkflow();
    const research = this.buildResearchWorkflow();

    this.kernel.workflows.register(greeting as any);
    this.kernel.workflows.register(research as any);

    // 4. Executar workflows
    console.log('  Executing workflows...');
    console.log();

    const greetResult = await this.kernel.workflows.start('app.greeting', { name: 'BeeHive' });
    console.log('  [greeting] status: ' + greetResult.status);
    console.log('  [greeting] result: ' + JSON.stringify(greetResult.stepResults?.response).slice(0, 80));

    const researchResult = await this.kernel.workflows.start('app.research', {
      topic: 'Artificial Intelligence',
      depth: 'summary',
    });
    console.log('  [research] status: ' + researchResult.status);
    console.log('  [research] summary: ' + JSON.stringify(researchResult.stepResults?.summary).slice(0, 80));

    // 5. Verificar
    const ok = greetResult.status === 'completed' && researchResult.status === 'completed';
    console.log();
    console.log('  ' + (ok ? '✓ Aplicacao funcionou sem modificar o BeeHive' : '✗ Falhou'));
    console.log();
    console.log('  Prova: Um terceiro pode construir sobre BeeHive');
    console.log('  usando apenas @beehive/sdk e o Kernel.');
    console.log();

    await this.kernel.shutdown();
  }

  private buildGreetingWorkflow() {
    return WorkflowBuilder.create('app.greeting', 'Greeting')
      .describe('Gera uma saudacao personalizada')
      .onManual()
      .step('greet', 'chat.generate', { message: 'Diga ola para {{input.name}} de forma criativa' }, 'response')
      .addOutput('greeting', '{{response.response}}')
      .build();
  }

  private buildResearchWorkflow() {
    return WorkflowBuilder.create('app.research', 'Research')
      .describe('Pesquisa um topico e gera um resumo')
      .onManual()
      .step('research', 'chat.generate', { message: 'Pesquise sobre {{input.topic}} com profundidade {{input.depth}}' }, 'summary')
      .addOutput('result', '{{summary.response}}')
      .build();
  }
}

const app = new HelloWorldApp();
app.start().catch(console.error);
