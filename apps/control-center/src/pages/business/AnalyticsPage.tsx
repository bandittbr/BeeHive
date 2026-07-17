import { Link } from 'react-router-dom';
import { ChevronLeft, BarChart3, TrendingUp, Activity, Cpu } from 'lucide-react';

const METRICS = [
  { label: 'Execuções hoje', value: '156', delta: '+12%', icon: Activity, color: 'var(--primary-light)' },
  { label: 'Tokens usados', value: '2.4M', delta: '+18%', icon: Cpu, color: 'var(--success)' },
  { label: 'Workflows ativos', value: '28', delta: '+5', icon: TrendingUp, color: 'var(--warning)' },
  { label: 'Latência média', value: '1.2s', delta: '-8%', icon: BarChart3, color: 'var(--primary-2)' },
];

const BAR_DATA = [
  { label: 'Seg', value: 65 },
  { label: 'Ter', value: 82 },
  { label: 'Qua', value: 45 },
  { label: 'Qui', value: 90 },
  { label: 'Sex', value: 73 },
  { label: 'Sáb', value: 30 },
  { label: 'Dom', value: 55 },
];

export default function AnalyticsPage() {
  const maxVal = Math.max(...BAR_DATA.map((d) => d.value));

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Analytics</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {METRICS.map((m) => (
            <div key={m.label} className="stat-card">
              <span className="stat-label">{m.label}</span>
              <span className="stat-value">{m.value}</span>
              <span className="stat-delta up">{m.delta}</span>
            </div>
          ))}
        </div>

        <div className="chat-panel" style={{ marginBottom: 0 }}>
          <div className="chat-panel-header">
            <h2 className="chat-title">Execuções por Dia</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 16 }}>
            {BAR_DATA.map((d) => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.value}</span>
                <div
                  style={{
                    width: '100%',
                    height: `${(d.value / maxVal) * 120}px`,
                    background: 'var(--gradient)',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    minHeight: 4,
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
