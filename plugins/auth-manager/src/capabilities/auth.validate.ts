import { Capability } from '@beehive/sdk';
import type { CapabilityInput, CapabilityOutput, CapabilityResult, ExecutionContext } from '@beehive/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export class AuthValidate extends Capability {
  readonly id = 'auth.validate';
  readonly name = 'Validar Sessão';
  readonly description = 'Valida sessão ativa contra o armazenamento';
  readonly inputs: CapabilityInput[] = [
    { name: 'sessionId', type: 'string', description: 'ID da sessão', required: true },
  ];
  readonly outputs: CapabilityOutput[] = [
    { name: 'valid', type: 'boolean', description: 'Se a sessão é válida' },
    { name: 'session', type: 'object', description: 'Dados da sessão' },
  ];

  async execute(params: Record<string, unknown>, ctx: ExecutionContext): Promise<CapabilityResult> {
    const start = Date.now();
    ctx.logger.info(`AuthValidate: sessionId=${params.sessionId}`);

    const provider = ctx.providers?.resolve(this.id);
    if (provider) return provider.execute(this.id, params, ctx);

    // Fallback: validar sessão em disco
    try {
      const sessionsPath = path.join(process.cwd(), 'data', 'auth', 'sessions.json');
      const sessions = JSON.parse(await fs.readFile(sessionsPath, 'utf-8').catch(() => '{}'));
      const session = sessions[params.sessionId as string];

      if (!session || new Date(session.expiresAt) < new Date()) {
        return {
          success: true,
          outputs: { valid: false, session: null },
          metrics: { duration: Date.now() - start },
        };
      }

      return {
        success: true,
        outputs: { valid: true, session },
        metrics: { duration: Date.now() - start },
      };
    } catch {
      return {
        success: true,
        outputs: { valid: false, session: null },
        metrics: { duration: Date.now() - start },
      };
    }
  }
}