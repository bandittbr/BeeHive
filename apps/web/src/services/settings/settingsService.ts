import { getRuntimeClient } from '@/app/runtimeClient';
import type { ModelsInfo } from '@/app/runtimeClient';
import { API_BASE } from '@/lib/api';

/**
 * Serviço de Configurações — fala com o Core para listar e trocar o modelo de
 * inteligência. Mantém a interface desacoplada do backend concreto.
 *
 * Sprint 13 (Platform Unification): não faz mais `fetch` direto — delega ao
 * `RuntimeClient`.
 * Sprint 16+: endpoints de providers para gerenciamento completo.
 */
export type { ModelsInfo };

async function safeJson<T>(res: Response): Promise<T> {
  try { return await res.json() as T; } catch { return {} as T; }
}

// ── Modelos (legado, mantido para compatibilidade) ───────────────────────

export function listModels(): Promise<ModelsInfo> {
  return getRuntimeClient().listModels();
}

export function setActiveModel(model: string): Promise<string> {
  return getRuntimeClient().setActiveModel(model);
}

// ── Providers (novo sistema) ─────────────────────────────────────────────

export interface ProviderCatalogStatus {
  id: string;
  name: string;
  icon: string;
  tier: 'local' | 'free' | 'paid';
  description: string;
  defaultBaseUrl: string;
  baseUrlEditable: boolean;
  requiresApiKey: boolean;
  defaultModel: string;
  capabilities: readonly string[];
  implementation: string;
  apiKeyPlaceholder?: string;
  baseUrlPlaceholder?: string;
  hasCredentials: boolean;
  isEnabled: boolean;
  isRegistered: boolean;
}

export interface ActiveProviderInfo {
  activeProviderId: string | null;
  activeModel: string | null;
}

export interface TestResult {
  ok: boolean;
  detail?: string;
}

/** Lista todos os providers do catálogo com status. */
export async function listProviders(): Promise<ProviderCatalogStatus[]> {
  const res = await fetch(`${API_BASE}/providers`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json() as Promise<ProviderCatalogStatus[]>;
}

/** Salva credenciais de um provider e o registra. */
export async function saveProvider(providerId: string, credentials: { apiKey?: string; baseUrl?: string }): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/providers/${providerId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const data = await safeJson<{ error?: string }>(res);
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<{ ok: boolean }>;
}

/** Testa a conexão com um provider. */
export async function testProvider(providerId: string, credentials?: { apiKey?: string; baseUrl?: string }): Promise<TestResult> {
  const res = await fetch(`${API_BASE}/providers/${providerId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials ?? {}),
  });
  return res.json() as Promise<TestResult>;
}

/** Define o provider ativo. */
export async function activateProvider(providerId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/providers/${providerId}/activate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await safeJson<{ error?: string }>(res);
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<{ ok: boolean }>;
}

/** Retorna provider e modelo ativos. */
export async function getActiveProvider(): Promise<ActiveProviderInfo> {
  const res = await fetch(`${API_BASE}/providers/active`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json() as Promise<ActiveProviderInfo>;
}

/** Define o modelo padrão. */
export async function setDefaultModel(model: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/providers/model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) {
    const data = await safeJson<{ error?: string }>(res);
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<{ ok: boolean }>;
}
