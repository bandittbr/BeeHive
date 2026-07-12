/**
 * Tipos do BeeRouter — sistema de roteamento inteligente de LLMs.
 *
 * Inspirado no 9router (https://github.com/decolua/9router):
 * - 3 tiers: subscription → cheap → free
 * - Fallback automático com backoff exponencial
 * - Múltiplas contas por provider
 * - Combos nomeados de modelos
 */

import type { AIProvider } from '../types';

// ---------------------------------------------------------------------------
// Categorias de provedores
// ---------------------------------------------------------------------------

export type ProviderCategory = 'local' | 'apikey' | 'free' | 'oauth';

// ---------------------------------------------------------------------------
// Configuração de um provedor no sistema
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  /** Id único (ex.: 'ollama', 'openrouter', 'groq', 'kiro') */
  id: string;
  /** Nome amigável */
  name: string;
  /** Categoria */
  category: ProviderCategory;
  /** Instância do provider */
  provider: AIProvider;
  /** Modelo padrão para este provider */
  model: string;
  /** Prioridade no fallback (menor = tentado primeiro) */
  priority: number;
  /** Máximo de requisições por minuto */
  maxRequestsPerMinute?: number;
  /** Máximo de tokens por minuto */
  maxTokensPerMinute?: number;
  /** Se está habilitado */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Controle de rate-limit
// ---------------------------------------------------------------------------

export interface RateLimitBucket {
  requests: number;
  tokens: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// Backoff
// ---------------------------------------------------------------------------

export interface BackoffState {
  level: number;
  blockedUntil: number;
}

// ---------------------------------------------------------------------------
// Combo — lista nomeada de modelos com fallback
// ---------------------------------------------------------------------------

export interface ComboModel {
  /** Id do provider (ex.: 'openrouter') */
  providerId: string;
  /** Modelo a usar (ex.: 'meta-llama/llama-3.1-8b-instruct') */
  model: string;
  /** Nome amigável para exibição */
  label?: string;
}

export interface Combo {
  /** Id único do combo */
  id: string;
  /** Nome amigável */
  name: string;
  /** Modelos em ordem de fallback */
  models: ComboModel[];
  /** Estratégia de fallback */
  strategy: 'sequential' | 'round-robin';
}

// ---------------------------------------------------------------------------
// Resultado de erro classificado
// ---------------------------------------------------------------------------

export interface ClassifiedError {
  shouldFallback: boolean;
  cooldownMs: number;
  isRateLimit: boolean;
  isAuth: boolean;
}

// ---------------------------------------------------------------------------
// Opções do BeeRouter
// ---------------------------------------------------------------------------

export interface BeeRouterOptions {
  /** Providers configurados */
  providers: ProviderConfig[];
  /** Combos predefinidos */
  combos?: Combo[];
  /** Combo padrão (id) */
  defaultComboId?: string;
  /** Intervalo de reset da janela de rate-limit em ms (padrão: 60s) */
  rateLimitWindowMs?: number;
  /** Logger opcional */
  logger?: {
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, ...args: unknown[]) => void;
  };
}

// ---------------------------------------------------------------------------
// Retrato do router para observabilidade
// ---------------------------------------------------------------------------

export interface BeeRouterSnapshot {
  activeProviderId: string | null;
  activeModel: string | null;
  activeComboId: string | null;
  providers: Array<{
    id: string;
    name: string;
    category: ProviderCategory;
    model: string;
    enabled: boolean;
    healthy: boolean;
    rateLimited: boolean;
  }>;
  combos: Array<{
    id: string;
    name: string;
    models: string[];
  }>;
}
