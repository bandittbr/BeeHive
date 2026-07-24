import { Plugin } from '@beehive/sdk';
import type { PluginContext, PluginManifest } from '@beehive/sdk';
import { AuthAuthenticate } from './capabilities/auth.authenticate';
import { AuthValidate } from './capabilities/auth.validate';
import { AuthKeyGenerate } from './capabilities/auth.key.generate';

export class AuthManagerPlugin extends Plugin {
  readonly id = 'plugin:auth-manager';
  readonly name = 'Auth Manager';
  readonly version = '1.0.0';
  readonly manifest: PluginManifest = {
    name: 'auth-manager',
    version: '1.0.0',
    description: 'Autenticação e autorização — API keys, tokens, RBAC',
    capabilities: ['auth.authenticate', 'auth.validate', 'auth.key.generate'],
    adapters: [],
    permissions: ['auth:manage', 'auth:validate'],
  };

  async activate(ctx: PluginContext): Promise<void> {
    ctx.logger.info('AuthManagerPlugin activating...');
    ctx.capabilities.register(this.id, new AuthAuthenticate());
    ctx.capabilities.register(this.id, new AuthValidate());
    ctx.capabilities.register(this.id, new AuthKeyGenerate());
    ctx.logger.info('AuthManagerPlugin activated with 3 capabilities');
  }

  async deactivate(): Promise<void> {}
}