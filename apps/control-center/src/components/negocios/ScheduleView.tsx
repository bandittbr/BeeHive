// Painel de postagens agendadas: mostra a fila do worker (Supabase), com status,
// horário e opção de cancelar. Atualiza sozinho a cada 20s.
import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Calendar, RefreshCcw, X } from 'lucide-react';
import { listSchedule, cancelSchedule, type ScheduledPost } from '../../services/scheduler';
import { isWorkerConfigured } from '../../services/worker';

const STATUS: Record<ScheduledPost['status'], { label: string; color: string; Icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: 'Agendado', color: '#f59e0b', Icon: Calendar },
  publishing: { label: 'Publicando', color: '#3b82f6', Icon: Loader2 },
  done: { label: 'Publicado', color: '#22c55e', Icon: CheckCircle2 },
  error: { label: 'Erro', color: '#ef4444', Icon: XCircle },
};

function fmt(ms: number): string {
  try {
    return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ScheduleView() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isWorkerConfigured()) { setLoaded(true); return; }
    setLoading(true);
    const list = await listSchedule();
    setPosts(list);
    setLoading(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const cancel = async (id: string) => {
    const ok = await cancelSchedule(id);
    if (ok) setPosts((p) => p.filter((x) => x.id !== id));
  };

  // não mostra nada até carregar; se não houver fila, mostra estado vazio discreto
  if (!loaded) return null;

  const pending = posts.filter((p) => p.status === 'pending' || p.status === 'publishing').length;

  return (
    <div style={{ marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: posts.length ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} />
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Fila de postagens</h2>
          {pending > 0 && (
            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: '#f59e0b22', color: '#f59e0b', fontWeight: 600 }}>{pending} na fila</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Atualizar"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? <Loader2 size={12} className="spin" /> : <RefreshCcw size={12} />} Atualizar
        </button>
      </div>

      {posts.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Nenhuma postagem agendada. Gere cortes e clique em "Agendar postagens" para o servidor publicar sozinho.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {posts.map((p) => {
            const s = STATUS[p.status];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <span title={s.label} style={{ display: 'inline-flex', color: s.color, flexShrink: 0 }}>
                  <s.Icon size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || p.file}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {s.label} · {fmt(p.at)}
                    {p.status === 'error' && p.error ? ` · ${p.error}` : ''}
                  </div>
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--primary-light)', textDecoration: 'none', flexShrink: 0 }}>ver</a>
                )}
                {(p.status === 'pending' || p.status === 'error') && (
                  <button
                    onClick={() => cancel(p.id)}
                    title="Cancelar / remover"
                    style={{ display: 'inline-flex', alignItems: 'center', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: 2 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
