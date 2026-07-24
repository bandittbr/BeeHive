import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class AIComplete extends Capability {
  readonly id = 'ai.complete';
  readonly name = 'Completar IA';
  readonly description = 'Executa chamada de IA completa (não-streaming) via provider registrado';
  readonly inputs: CapabilityInput[] = [
    { name: 'model', type: 'string', description: 'Modelo de IA', required: true },
    { name: 'messages', type: 'array', description: 'Mensagens para o modelo', required: true },
    { name: 'temperature', type: 'number', description: 'Temperatura (0-2)', required: false },
    { name: 'maxTokens', type: 'number', description: 'Máximo de tokens', required: false },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'content', type: 'string', description: 'Resposta gerada' },
    { name: 'usage', type: 'object', description: 'Tokens utilizados' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`AIComplete: model=${params.model}, messages=${(params.messages as any[])?.length}`);

    // Tenta rotear para um provider registrado
    const provider = ctx.providers?.resolve(this.id);
    if (provider) {
      ctx.logger.info(`AIComplete: roteado para provider ${provider.id}`);
      return provider.execute(this.id, params, ctx);
    }

    // Fallback: resposta simulada
    ctx.logger.warn('AIComplete: nenhum provider registrado, usando fallback');
    return {
      success: true,
      outputs: {
        content: `[Fallback] Resposta simulada para modelo "${params.model}" com ${(params.messages as any[])?.length} mensagens. Configure um provider de IA (OpenAI, Anthropic, etc.) para respostas reais.`,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      },
      metrics: { duration: Date.now() - start },
    };
  }
}