import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export class AuthAuthenticate extends Capability {
  readonly id = 'auth.authenticate';
  readonly name = 'Autenticar';
  readonly description = 'Autentica usando API key contra o armazenamento local';
  readonly inputs: CapabilityInput[] = [
    { name: 'apiKey', type: 'string', description: 'Chave de API', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'session', type: 'object', description: 'Sessão autenticada' },
    { name: 'authenticated', type: 'boolean', description: 'Se autenticou' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    const key = params.apiKey as string;
    ctx.logger.info(`AuthAuthenticate: key=${key.slice(0, 8)}...`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: validar contra chaves salvas em disco
    try {
      const keysPath = path.join(process.cwd(), 'data', 'auth', 'api-keys.json');
      const keysData = JSON.parse(await fs.readFile(keysPath, 'utf-8').catch(() => '{}'));
      const keyEntry = keysData[key];

      if (!keyEntry) {
        return {
          success: true,
          outputs: { session: null, authenticated: false },
          metrics: { duration: Date.now() - start },
        };
      }

      const session = {
        id: uuidv4(),
        userId: keyEntry.userId,
        role: keyEntry.role || 'user',
        permissions: keyEntry.permissions || [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      return {
        success: true,
        outputs: { session, authenticated: true },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: { session: null, authenticated: false },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}