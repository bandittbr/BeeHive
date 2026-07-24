// Login/cadastro contra o worker (apps/worker/src/index.ts: /api/auth/*).
import { BEEHIVE_API_URL } from './beehiveApi';
import { AUTH_TOKEN_KEY, getAuthToken } from './authToken';

export interface AuthUser {
  id: string;
  email: string;
  currentProviderId?: string | null;
  currentModel?: string | null;
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function signup(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${BEEHIVE_API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseErrorBody(res));
  const data = await res.json();
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  return data;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${BEEHIVE_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseErrorBody(res));
  const data = await res.json();
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  return data;
}

export async function me(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(`${BEEHIVE_API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export function logout(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
