import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { Bot, ChevronLeft, Play, Square } from 'lucide-react';

export default function AgentsPage() {
  const { projects } = useAppStore();
  const agents = useMemo(() => projects.flatMap((p) => p.agents), [projects]);
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((a) => [a.id, a.status]))
  );

  const toggleStatus = (id: string) => {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === 'idle' ? 'running' : 'idle',
    }));
  };

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Agentes</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agents.map((agent) => {
            const status = statuses[agent.id] ?? agent.status;
            return (
              <div
                key={agent.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: agent.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bot size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.task}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 20,
                      background: status === 'running' || status === 'working' ? 'var(--success-muted)' : 'var(--surface-3)',
                      color: status === 'running' || status === 'working' ? 'var(--success)' : 'var(--text-muted)',
                    }}
                  >
                    {status}
                  </span>
                  <button
                    onClick={() => toggleStatus(agent.id)}
                    className="icon-square-btn"
                    title={status === 'idle' ? 'Start' : 'Stop'}
                  >
                    {status === 'idle' ? <Play size={14} /> : <Square size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
