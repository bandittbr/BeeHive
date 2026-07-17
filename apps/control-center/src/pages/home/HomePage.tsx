import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { CheckCircle2, AlertTriangle, XCircle, Bot, ArrowRight } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  running: 'badge-info',
  completed: 'badge-success',
  error: 'badge-error',
  scheduled: 'badge-warning',
  active: 'badge-success',
  paused: 'badge-warning',
};

const EVENT_ICON: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: CheckCircle2,
};

export default function HomePage() {
  const navigate = useNavigate();
  const { missions, events, projects } = useAppStore();

  const agents = useMemo(
    () => projects.flatMap((p) => p.agents),
    [projects],
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mission Control</h1>
      </div>

      {/* ── Missions ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Missions</h2>
        </div>
        <div className="cards-grid">
          {missions.map((m) => (
            <div key={m.id} className="card">
              <div className="card-title">{m.name}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${m.progress}%` }} />
              </div>
              <span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-info'}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agents ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Agents</h2>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {agents.map((a) => (
            <button
              key={a.id}
              className="agent-row"
              onClick={() => navigate('/negocios/agents')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span
                className="agent-avatar"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: a.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Bot size={16} color="#fff" />
              </span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{a.status}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Queue ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Queue</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {missions.map((m) => (
            <div
              key={m.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.name}</span>
              <span className={`badge ${STATUS_BADGE[m.status] ?? 'badge-info'}`}>{m.progress}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Events ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Events</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {events.map((ev) => {
            const Icon = EVENT_ICON[ev.type] ?? CheckCircle2;
            return (
              <div key={ev.id} className="event-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                <span className="event-icon" style={{ flexShrink: 0, display: 'flex' }}>
                  <Icon size={16} />
                </span>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-secondary)' }}>{ev.text}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>{ev.time}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Projects ── */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Projects</h2>
        </div>
        <div className="cards-grid">
          {projects.map((p) => (
            <button
              key={p.id}
              className="card"
              onClick={() => navigate(`/projects/${p.id}`)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <span className="card-title">{p.name}</span>
              </div>
              <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-info'}`}>{p.status}</span>
              <ArrowRight size={14} style={{ position: 'absolute', top: 14, right: 14, color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
