/**
 * Contratos do Sistema de Plugins do BeeHive.
 *
 * Um plugin é uma unidade de extensibilidade de terceiros que pode ser
 * instalada, ativada e desativada dinamicamente. Diferente dos módulos
 * (que são partes estruturais do sistema), plugins são opcionais e
 * adicionam capacidades específicas.
 *
 * Cada plugin possui manifesto, configurações, permissões, versão,
 * dependências, comandos disponíveis e eventos suportados.
 */

import type { IPlugin, PluginManifest, PluginPermission, PluginState } from '../kernel/types';

export type {
  IPlugin,
  PluginManifest,
  PluginPermission,
  PluginState,
};

/** Status de saúde de um plugin */
export interface PluginHealth {
  readonly ok: boolean;
  readonly detail?: string;
}

/** Snapshot de um plugin para observabilidade */
export interface PluginSnapshot {
  readonly manifest: PluginManifest;
  readonly state: PluginState;
  readonly active: boolean;
  readonly uptimeMs: number | null;
  readonly lastError: string | null;
  readonly health: PluginHealth;
}

/** Opções de configuração para um plugin específico */
export interface PluginConfigOptions {
  /** Configurações chave-valor */
  [key: string]: unknown;
}

/** Contexto que um plugin recebe para interagir com o sistema */
export interface PluginContext {
  /** ID do plugin */
  readonly pluginId: string;
  /** Configurações do plugin */
  readonly config: PluginConfigOptions;
  /** Emitir um evento no barramento do sistema */
  emit(event: string, payload?: unknown): void;
  /** Registrar um comando */
  registerCommand(type: string, handler: (payload: unknown) => unknown | Promise<unknown>): void;
  /** Obter um serviço do sistema */
  getService<T>(id: string): T | undefined;
  /** Logging com escopo do plugin */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void;
}

/** Factory que cria uma instância de plugin */
export interface PluginFactory {
  (context: PluginContext): IPlugin | Promise<IPlugin>;
}

/** Metadados de um plugin no registro */
export interface PluginRegistration {
  /** ID único do plugin */
  id: string;
  /** Versão do plugin */
  version: string;
  /** Fábrica que cria a instância */
  factory: PluginFactory;
  /** Configurações padrão */
  defaultConfig?: PluginConfigOptions;
  /** Se deve ser carregado automaticamente */
  autoLoad?: boolean;
}
