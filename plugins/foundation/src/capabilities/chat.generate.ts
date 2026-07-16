import { Capability, Artifact } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class ChatGenerate extends Capability {
  readonly id = 'chat.generate';
  readonly name = 'Gerar Resposta';
  readonly description = 'Gera resposta de IA a partir de uma mensagem';
  readonly inputs: CapabilityInput[] = [
    { name: 'message', type: 'string', description: 'Mensagem do usuario', required: true },
    { name: 'provider', type: 'string', description: 'Provedor de IA', required: false },
    { name: 'model', type: 'string', description: 'Modelo', required: false },
    { name: 'stream', type: 'boolean', description: 'Streaming', required: false, default: false },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'response', type: 'string', description: 'Resposta gerada' },
    { name: 'usage', type: 'object', description: 'Tokens utilizados' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    ctx.logger.info('ChatGenerate: ' + params.message);

    // TODO: chamar adapter (OpenRouter / OpenAI / Ollama)
    const response = 'Resposta simulada para: ' + params.message;

    const artifact = new Artifact({
      type: 'markdown',
      createdBy: this.id,
      data: response,
      metadata: { model: params.model ?? 'default', provider: params.provider ?? 'openrouter' },
    });

    ctx.events.publish({
      type: 'chat:generated',
      source: this.id,
      payload: { artifactId: artifact.id, message: params.message },
      timestamp: Date.now(),
    });

    return {
      success: true,
      outputs: { response, usage: { promptTokens: 50, completionTokens: 150, totalTokens: 200 } },
      metrics: { duration: 1200 },
    };
  }
}
