import { useState, useEffect } from "react";
import { Loader2, Sparkles, AlertCircle, LogOut } from "lucide-react";
import { login, signup, me, logout as logoutRequest, type AuthUser } from "@/services/authService";
import { getAuthToken } from "@/services/authToken";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

interface AuthGateProps {
  children: React.ReactNode;
}

// Porta de entrada: sem sessão válida, mostra login/cadastro. Com sessão,
// renderiza o app normalmente. As API keys de IA (Settings > Providers) só
// existem depois disso — ficam salvas no banco, atreladas a este usuário.
export function AuthGate({ children }: AuthGateProps) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!getAuthToken()) { setChecking(false); return; }
    me().then((u) => { setUser(u); setChecking(false); }).catch(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    logoutRequest();
    setUser(null);
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthenticated={setUser} />;
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={handleLogout}
        title={`Sair (${user.email})`}
        style={{
          position: 'fixed', bottom: 12, left: 12, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8, fontSize: 12,
          border: '1px solid var(--border, #2a2a2e)', background: 'var(--bg, #0b0b0f)',
          color: 'var(--text-muted, #999)', cursor: 'pointer', opacity: 0.7,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
      >
        <LogOut size={12} />
        {user.email}
      </button>
    </>
  );
}

function AuthForm({ onAuthenticated }: { onAuthenticated: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = mode === 'login' ? await login(email, password) : await signup(email, password);
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao autenticar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg, #0b0b0f)' }}>
      <div className="rounded-2xl border border-border bg-muted/20 p-8" style={{ width: 360 }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-lg font-semibold">BeeHive</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === 'login' ? 'Entre para continuar.' : 'Crie sua conta — suas chaves de IA ficam salvas nela.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className={inputCls} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Senha</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" className={inputCls} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === 'login' ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  );
}
