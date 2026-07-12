/**
 * Classificador de erros — decide se deve fazer fallback e por quanto tempo.
 *
 * Inspirado no errorConfig.js do 9router:
 * - Rate limits (429, "rate limit", "too many requests") → backoff exponencial
 * - Erros de autenticação (401, 403) → cooldown fixo de 2min
 * - Erros de quota (402, "quota exceeded") → cooldown longo
 * - Erros de capacidade/overloaded → backoff exponencial
 * - Erros transitórios → cooldown curto de 30s
 */

import type { ClassifiedError } from './types';

// ---------------------------------------------------------------------------
// Regras de classificação (ordem importa: primeira correspondente vence)
// ---------------------------------------------------------------------------

interface ErrorRule {
  match: (status: number, text: string) => boolean;
  cooldownMs: (level: number) => number;
  isRateLimit: boolean;
  isAuth: boolean;
}

const ERROR_RULES: ErrorRule[] = [
  // --- Erros de autenticação ---
  {
    match: (status) => status === 401 || status === 403,
    cooldownMs: () => 120_000, // 2 minutos
    isRateLimit: false,
    isAuth: true,
  },
  // --- Erros de pagamento/quota ---
  {
    match: (status, text) =>
      status === 402 ||
      status === 429 ||
      text.includes('quota') ||
      text.includes('insufficient') ||
      text.includes('payment'),
    cooldownMs: (level) => Math.min(2000 * Math.pow(2, level), 300_000), // 2s → 4s → 8s → ... → 5min max
    isRateLimit: true,
    isAuth: false,
  },
  // --- Rate limits explícitos ---
  {
    match: (_status, text) =>
      text.includes('rate limit') ||
      text.includes('too many requests') ||
      text.includes('rate_limit') ||
      text.includes('capacity') ||
      text.includes('overloaded') ||
      text.includes('try again later'),
    cooldownMs: (level) => Math.min(2000 * Math.pow(2, level), 300_000),
    isRateLimit: true,
    isAuth: false,
  },
  // --- Erros de servidor (transitórios) ---
  {
    match: (status) => status >= 500 && status < 600,
    cooldownMs: () => 30_000, // 30 segundos
    isRateLimit: false,
    isAuth: false,
  },
  // --- Erro genérico (sem credenciais, etc.) ---
  {
    match: (_status, text) =>
      text.includes('no credentials') ||
      text.includes('not found') ||
      text.includes('not configured'),
    cooldownMs: () => 120_000,
    isRateLimit: false,
    isAuth: false,
  },
];

// ---------------------------------------------------------------------------
// Classificador
// ---------------------------------------------------------------------------

/**
 * Classifica um erro e retorna a decisão de fallback.
 *
 * @param status - Código HTTP (0 se não houve resposta HTTP)
 * @param errorText - Texto do erro
 * @param backoffLevel - Nível atual de backoff (0 = primeira tentativa)
 */
export function classifyError(
  status: number,
  errorText: string,
  backoffLevel: number = 0,
): ClassifiedError {
  const text = errorText.toLowerCase();

  for (const rule of ERROR_RULES) {
    if (rule.match(status, text)) {
      return {
        shouldFallback: true,
        cooldownMs: rule.cooldownMs(backoffLevel),
        isRateLimit: rule.isRateLimit,
        isAuth: rule.isAuth,
      };
    }
  }

  // Erro não classificado: fallback com cooldown conservador
  return {
    shouldFallback: true,
    cooldownMs: 30_000,
    isRateLimit: false,
    isAuth: false,
  };
}

/**
 * Extrai o código HTTP de uma mensagem de erro, se presente.
 */
export function extractHttpStatus(errorText: string): number {
  const match = errorText.match(/\b(\d{3})\b/);
  if (match) {
    const code = parseInt(match[1], 10);
    if (code >= 400 && code < 600) return code;
  }
  return 0;
}
