/**
 * Provider Commands — comandos do Kernel para gerenciamento de providers.
 *
 * Registra comandos como `provider.list`, `provider.save`, `provider.test`,
 * `provider.activate`, `provider.deactivate` e `provider.models` no
 * CommandDispatcher do Kernel.
 *
 * Uso:
 *   registerProviderCommands(kernel.context, providerManager, db);
 */
import type { KernelContext } from '../kernel/types';
import type { ProviderManager } from './ProviderManager';
import type { StoredCredentials } from './providers/credentialsStore';
import type Database from 'better-sqlite3';
import { getCatalogEntry } from './providers/catalog';

/** IDs dos comandos de provider. */
export const PROVIDER_COMMANDS = {
  LIST: 'provider.list',
  SAVE: 'provider.save',
  TEST: 'provider.test',
  ACTIVATE: 'provider.activate',
  DEACTIVATE: 'provider.deactivate',
  MODELS: 'provider.models',
  ACTIVE: 'provider.active',
} as const;

/**
 * Registra todos os comandos de provider no Kernel.
 */
export function registerProviderCommands(
  ctx: KernelContext,
  manager: ProviderManager,
  db: Database.Database,
): void {
  // ── provider.list ──────────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.LIST, async () => {
    return manager.getCatalogStatus(db);
  });

  // ── provider.save ──────────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.SAVE, async (payload) => {
    const { providerId, credentials } = payload as {
      providerId: string;
      credentials: StoredCredentials;
    };

    const entry = getCatalogEntry(providerId);
    if (!entry) {
      throw new Error(`Provider não encontrado no catálogo: ${providerId}`);
    }

    await manager.saveAndRegister(entry, credentials, db);
    ctx.events.emit('ProviderChanged', {
      providerId,
      previousProviderId: manager.getDefaultProviderId(),
    });

    return { ok: true, providerId };
  });

  // ── provider.test ──────────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.TEST, async (payload) => {
    const { providerId, credentials } = payload as {
      providerId: string;
      credentials?: StoredCredentials;
    };

    const entry = getCatalogEntry(providerId);
    if (!entry) {
      throw new Error(`Provider não encontrado no catálogo: ${providerId}`);
    }

    return manager.testConnection(entry, credentials);
  });

  // ── provider.activate ──────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.ACTIVATE, (payload) => {
    const { providerId } = payload as { providerId: string };
    manager.setDefaultProvider(providerId);
    return { ok: true, activeProviderId: providerId };
  });

  // ── provider.deactivate ────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.DEACTIVATE, (payload) => {
    const { providerId } = payload as { providerId: string };
    manager.deactivate(providerId);
    return { ok: true };
  });

  // ── provider.models ────────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.MODELS, async (payload) => {
    const { providerId } = payload as { providerId: string };
    const models = await manager.availableModels(providerId);
    return { models, activeModel: manager.getDefaultModel() };
  });

  // ── provider.active ────────────────────────────────────────────────────
  ctx.registerCommand(PROVIDER_COMMANDS.ACTIVE, () => {
    return {
      activeProviderId: manager.getDefaultProviderId(),
      activeModel: manager.getDefaultModel(),
    };
  });

}
