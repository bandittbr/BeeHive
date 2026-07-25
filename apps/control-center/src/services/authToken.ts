// Chave do token de sessão no localStorage. Em módulo próprio pra evitar
// import circular entre authService.ts e beehiveApi.ts (ambos precisam dele).
export const AUTH_TOKEN_KEY = 'beehive-auth-token';

export function getAuthToken(): string | null {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
}

// Header pronto pra chamadas autenticadas no backend real (apps/worker).
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
