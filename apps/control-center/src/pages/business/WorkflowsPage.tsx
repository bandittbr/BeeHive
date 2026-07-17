import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { ChevronLeft, Workflow, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const STATUS_ICON: Record<string, typeof Workflow> = {
  running: Loader2,
  completed: CheckCircle2,
  error: XCircle,
  scheduled: Workflow,
};

const STATUS_COLOR: Record<string, string> = {
  running: 'var(--primary-light)',
  completed: 'var(--success)',
  error: 'var(--danger)',
  scheduled: 'var(--text-muted)',
};

export default function WorkflowsPage() {
  const { projects } = useAppStore();
  const workflows = useMemo(() => projects.flatMap((p) => p.workflows), [projects]);

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Workflows</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workflows.map((wf) => {
            const Icon = STATUS_ICON[wf.status] ?? Workflow;
            const color = STATUS_COLOR[wf.status] ?? 'var(--text-muted)';
            return (
              <div
                key={wf.id}
                style={{
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={16} style={{ color, animation: wf.status === 'running' ? 'spin 1s linear infinite' : 'none' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{wf.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color }}>{wf.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${wf.progress}%`, background: color === 'var(--danger)' ? 'var(--danger)' : undefined }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
