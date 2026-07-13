/**
 * Base de URL da API do BeeHive.
 *
 * Em produção (Vercel) o frontend e o backend (Railway) ficam em domínios
 * diferentes, então TODAS as chamadas de API e o WebSocket precisam apontar
 * para o backend via `VITE_API_URL`. Em dev, cai no proxy `/api` do Vite.
 *
 * Única fonte da base — evita chamadas relativas que batem no HTML do Vercel
 * e quebram com "Unexpected token '<'".
 */
const RAW = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

function originOf(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

const ORIGIN = originOf(RAW); // '' (mesmo domínio) ou 'https://...railway.app'

/** Base HTTP das chamadas de API, ex.: 'https://...railway.app/api' ou '/api'. */
export const API_BASE: string = ORIGIN ? `${ORIGIN}/api` : '/api';

/** Monta a URL do WebSocket (conversa em tempo real) a partir do mesmo destino. */
export function wsUrl(path: string): string {
  const origin = ORIGIN || window.location.origin;
  const proto = origin.startsWith('https') ? 'wss' : 'ws';
  const clean = origin.replace(/^https?:\/\//, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${proto}://${clean}${p}`;
}
