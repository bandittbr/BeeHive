import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class AIModelsList extends Capability {
  readonly id = 'ai.models.list';
  readonly name = 'Listar Modelos';
  readonly description = 'Lista modelos disponíveis por provedor';
  readonly inputs: CapabilityInput[] = [];
  readonly outputs: CapabilityOutput[] = [
    { name: 'models', type: 'array', description: 'Modelos disponíveis' },
  ];

  async execute(_params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info('AIModelsList');

    // Tenta obter modelos dos providers registrados
    const provider = ctx.providers?.resolve('ai.complete');
    if (provider) {
      return provider.execute('ai.models.list', {}, ctx);
    }

    return {
      success: true,
      outputs: {
        models: [
          { provider: 'openai', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
          { provider: 'anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
          { provider: 'google', models: ['gemini-pro', 'gemini-ultra'] },
          { provider: 'ollama', models: ['llama3', 'mistral', 'codellama'] },
        ],
      },
      metrics: { duration: Date.now() - start },
    };
  }
}