export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
  workspaces: string[];
  createdAt: number;
}

export type UserRole = 'ADMIN' | 'USER';

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password?: string;
  provider?: string;
  code?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface IAuthService {
  login(request: LoginRequest): Promise<AuthTokens>;
  register(request: RegisterRequest): Promise<AuthTokens>;
  logout(sessionId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  validateToken(token: string): Promise<AuthUser>;
  getSession(sessionId: string): Promise<AuthSession | null>;
}
