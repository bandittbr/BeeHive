import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';

export class MarketplaceUninstall extends Capability {
  readonly id = 'marketplace.uninstall';
  readonly name = 'Desinstalar Plugin';
  readonly description = 'Desinstala plugin';
  readonly inputs: CapabilityInput[] = [
    { name: 'pluginId', type: 'string', description: 'ID do plugin', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'success', type: 'boolean', description: 'Se desinstalou' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`MarketplaceUninstall: ${params.pluginId}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    return {
      success: true,
      outputs: { success: true, message: `Plugin "${params.pluginId}" marcado para desinstalação. Remova o diretório plugins/${params.pluginId} manualmente.` },
      metrics: { duration: Date.now() - start },
    };
  }
}