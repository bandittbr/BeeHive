import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class AIStream extends Capability {
  readonly id = 'ai.stream';
  readonly name = 'Stream IA';
  readonly description = 'Executa chamada de IA com streaming via provider registrado';
  readonly inputs: CapabilityInput[] = [
    { name: 'model', type: 'string', description: 'Modelo de IA', required: true },
    { name: 'messages', type: 'array', description: 'Mensagens para o modelo', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'stream', type: 'object', description: 'Stream de resposta' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`AIStream: model=${params.model}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) {
      ctx.logger.info(`AIStream: roteado para provider ${provider.id}`);
      return provider.execute(this.id, params, ctx);
    }

    return {
      success: true,
      outputs: {
        stream: { type: 'text', chunks: ['[Fallback] ', 'Streaming ', 'simulado. ', 'Configure um provider de IA.'] },
      },
      metrics: { duration: Date.now() - start },
    };
  }
}