// External Weather Plugin — Demo
// Uso: npx tsx examples/integrations/external-weather-plugin/run.ts
//
// Prova: um plugin externo pode ser criado e executado sem modificar o BeeHive.

import { Kernel } from '../../../kernel/Kernel';
import { WorkflowBuilder, MockAdapter } from '@beehive/sdk';

async function main() {
  console.log();
  console.log('  External Weather Plugin Demo');
  console.log('  ============================');
  console.log('  Prova: plugin externo funcional sem modificar o Kernel.');
  console.log();

  const kernel = new Kernel();
  await kernel.boot();

  // O plugin weather já foi descoberto automaticamente pelo PluginRegistry
  const hasWeather = kernel.capabilities.list().some(e => e.capability.id === 'weather.current');
  console.log('  weather.current: ' + (hasWeather ? '✓ descoberto automaticamente' : '✗ nao encontrado'));

  if (!hasWeather) {
    console.log('  Copie o plugin para plugins/ e reinicie.');
    await kernel.shutdown();
    return;
  }

  const workflow = WorkflowBuilder.create('weather-demo', 'Weather Demo')
    .describe('Consulta o clima de uma cidade')
    .onManual()
    .step('weather', 'weather.current', { city: '{{input.city}}' }, 'result')
    .addOutput('report', 'Clima em {{input.city}}: {{result.condition}}, {{result.temperature}}C')
    .build();

  kernel.workflows.register(workflow as any);

  const instance = await kernel.workflows.start('weather-demo', { city: 'Sao Paulo' });

  console.log('  Status: ' + instance.status);
  if (instance.stepResults?.result) {
    const r = instance.stepResults.result as any;
    console.log('  Cidade: Sao Paulo');
    console.log('  Temperatura: ' + r.temperature + 'C');
    console.log('  Condicao: ' + r.condition);
    console.log('  Umidade: ' + r.humidity + '%');
  }
  console.log();
  console.log('  ✓ Plugin externo funcionou sem modificar o Kernel.');
  console.log();

  await kernel.shutdown();
}

main().catch(console.error);
