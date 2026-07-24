import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

export class AuthKeyGenerate extends Capability {
  readonly id = 'auth.key.generate';
  readonly name = 'Gerar API Key';
  readonly description = 'Gera nova API key para um usuário';
  readonly inputs: CapabilityInput[] = [
    { name: 'userId', type: 'string', description: 'ID do usuário', required: true },
    { name: 'permissions', type: 'array', description: 'Permissões da chave', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'apiKey', type: 'string', description: 'Nova chave de API' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`AuthKeyGenerate: userId=${params.userId}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: gerar e salvar chave
    try {
      const apiKey = `bh_${randomBytes(24).toString('hex')}`;
      const keysPath = path.join(process.cwd(), 'data', 'auth', 'api-keys.json');
      const keys = JSON.parse(await fs.readFile(keysPath, 'utf-8').catch(() => '{}'));
      keys[apiKey] = {
        userId: params.userId,
        permissions: params.permissions,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      await fs.writeFile(keysPath, JSON.stringify(keys, null, 2));

      return {
        success: true,
        outputs: { apiKey },
        metrics: { duration: Date.now() - start },
      };
    } catch (error) {
      return {
        success: false,
        outputs: {},
        error: error instanceof Error ? error.message : 'Erro ao gerar chave',
        metrics: { duration: Date.now() - start },
      };
    }
  }
}