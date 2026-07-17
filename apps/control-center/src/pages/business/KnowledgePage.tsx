import { Link } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, Search } from 'lucide-react';
import { useState } from 'react';

interface KDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

const MOCK_DOCS: KDocument[] = [
  { id: '1', name: 'Guia de Marketing Digital', type: 'PDF', size: '2.4 MB', uploadedAt: '2024-01-15' },
  { id: '2', name: 'API Documentation', type: 'MD', size: '120 KB', uploadedAt: '2024-01-14' },
  { id: '3', name: 'Base de Conhecimento BeeHive', type: 'TXT', size: '890 KB', uploadedAt: '2024-01-13' },
  { id: '4', name: 'Relatório de Vendas Q4', type: 'CSV', size: '1.1 MB', uploadedAt: '2024-01-12' },
];

export default function KnowledgePage() {
  const [search, setSearch] = useState('');
  const filtered = MOCK_DOCS.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Knowledge Base</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="chat-input-box" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, flex: 1 }}
              />
            </div>
            <button className="input-send-btn" style={{ width: 'auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
              <Upload size={14} />
              Upload
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.type} — {doc.size}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.uploadedAt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
