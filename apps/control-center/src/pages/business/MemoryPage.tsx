import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Brain, Plus, Trash2 } from 'lucide-react';

interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

const INITIAL_MEMORY: MemoryEntry[] = [
  { id: '1', key: 'user_preference', value: 'Idioma padrão: Português', updatedAt: '2024-01-15' },
  { id: '2', key: 'project_context', value: 'BeeHive é uma plataforma de IA modular', updatedAt: '2024-01-14' },
  { id: '3', key: 'api_config', value: 'OpenRouter: max_tokens=4096', updatedAt: '2024-01-13' },
  { id: '4', key: 'marketing_tone', value: 'Tom casual e profissional', updatedAt: '2024-01-12' },
];

export default function MemoryPage() {
  const [entries, setEntries] = useState(INITIAL_MEMORY);
  const [search, setSearch] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const filtered = entries.filter(
    (e) => e.key.includes(search.toLowerCase()) || e.value.toLowerCase().includes(search.toLowerCase())
  );

  const addEntry = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setEntries((prev) => [
      { id: Date.now().toString(), key: newKey, value: newValue, updatedAt: new Date().toISOString().slice(0, 10) },
      ...prev,
    ]);
    setNewKey('');
    setNewValue('');
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Memory</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chat-input-box">
            <input
              type="text"
              placeholder="Buscar memória..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="chat-input-box"
              style={{ flex: 1 }}
            />
            <input
              type="text"
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="chat-input-box"
              style={{ flex: 2 }}
            />
            <button className="input-send-btn" onClick={addEntry} style={{ width: 40, height: 40 }}>
              <Plus size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((entry) => (
              <div
                key={entry.id}
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
                  <Brain size={16} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-light)', fontFamily: 'monospace' }}>{entry.key}</span>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.value}</div>
                  </div>
                </div>
                <button onClick={() => deleteEntry(entry.id)} className="icon-square-btn" style={{ flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
