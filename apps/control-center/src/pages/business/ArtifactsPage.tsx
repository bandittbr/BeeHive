import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { ChevronLeft, FolderKanban, Image as ImageIcon, FileText, Code2 } from 'lucide-react';

const TYPE_ICON: Record<string, typeof FileText> = {
  Image: ImageIcon,
  Code: Code2,
  default: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  Image: '#ec4899',
  Code: '#06b6d4',
};

export default function ArtifactsPage() {
  const { projects } = useAppStore();
  const allArtifacts = useMemo(() => projects.flatMap((p) => p.artifacts), [projects]);
  const [filter, setFilter] = useState<string>('all');

  const types = useMemo(() => {
    const unique = [...new Set(allArtifacts.map((a) => a.type))];
    return ['all', ...unique];
  }, [allArtifacts]);

  const filtered = filter === 'all' ? allArtifacts : allArtifacts.filter((a) => a.type === filter);

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Artifacts</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="selector-pill"
              style={{
                borderColor: filter === type ? 'var(--primary)' : 'var(--border)',
                color: filter === type ? 'var(--primary-light)' : 'var(--text-secondary)',
              }}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {filtered.map((artifact) => {
            const Icon = TYPE_ICON[artifact.type] ?? TYPE_ICON.default;
            const color = TYPE_COLOR[artifact.type] ?? 'var(--text-muted)';
            return (
              <div
                key={artifact.id}
                style={{
                  padding: '16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: `${color}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artifact.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{artifact.size}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)' }}>
                  <span>{artifact.type}</span>
                  <span>{artifact.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
