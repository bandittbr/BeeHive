// BeeHive OS — Entry Point
// Valida o fluxo completo: Kernel -> PluginDiscovery -> FoundationPlugin -> Capability -> Response

import { Kernel } from '../kernel/Kernel';
import { ChatUseCase } from '../application/use-cases/chat/ChatUseCase';

async function main() {
  console.log('=== BeeHive OS Boot Sequence ===\n');

  const kernel = new Kernel();
  const report = await kernel.boot();

  console.log('Kernel Status:', report.kernel.status);
  console.log('Duration:', report.kernel.duration + 'ms');
  console.log('Plugins:', report.plugins.map(p => p.id + ' -> ' + p.status).join(', '));
  console.log('Capabilities:', report.capabilities + ' registradas\n');

  if (report.plugins.some(p => p.status === 'failed')) {
    console.log('Plugin failures:');
    report.plugins.filter(p => p.status === 'failed').forEach(p => {
      console.log('  - ' + p.id + ': ' + p.error);
    });
    console.log();
  }

  // Test ChatUseCase
  console.log('=== Chat Use Case Test ===\n');
  const chatUseCase = new ChatUseCase(kernel.capabilities as any, kernel.logger as any);
  const response = await chatUseCase.execute({ message: 'Ola, qual a capital do Brasil?', provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct' });
  console.log('Response:', response.text);
  console.log('Usage:', JSON.stringify(response.usage));
  console.log('Duration:', response.duration + 'ms\n');

  console.log('=== BeeHive OS Boot Complete ===');
}

main().catch(console.error);
