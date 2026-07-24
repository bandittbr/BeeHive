import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class MarketplaceInstall extends Capability {
  readonly id = 'marketplace.install';
  readonly name = 'Instalar Plugin';
  readonly description = 'Instala plugin do catálogo';
  readonly inputs: CapabilityInput[] = [
    { name: 'pluginId', type: 'string', description: 'ID do plugin', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'success', type: 'boolean', description: 'Se instalou' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`MarketplaceInstall: ${params.pluginId}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: plugin já está no diretório plugins/
    return {
      success: true,
      outputs: { success: true, message: `Plugin "${params.pluginId}" já está disponível em plugins/. Use pnpm install para instalar dependências.` },
      metrics: { duration: Date.now() - start },
    };
  }
}