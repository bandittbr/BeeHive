import { useState } from 'react';
import { Puzzle } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

const INITIAL_PLUGINS: Plugin[] = [
  { id: 'browser', name: 'Browser Plugin', description: 'Navegação web e scraping automatizado', version: '2.1.0', enabled: true },
  { id: 'memory', name: 'Memory Plugin', description: 'Sistema de memória persistente para agentes', version: '1.4.2', enabled: true },
  { id: 'weather', name: 'Weather Plugin', description: 'Consulta de previsão do tempo e dados climáticos', version: '1.0.0', enabled: false },
];

export default function PluginsPage() {
  const [plugins, setPlugins] = useState(INITIAL_PLUGINS);

  const togglePlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Plugins</h2>
        <div className="chat-selectors">
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {plugins.filter((p) => p.enabled).length} de {plugins.length} ativos
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: plugin.enabled ? 'var(--primary-muted)' : 'var(--surface-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: plugin.enabled ? 'var(--primary-light)' : 'var(--text-muted)',
                }}
              >
                <Puzzle size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{plugin.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  v{plugin.version} — {plugin.description}
                </div>
              </div>
            </div>

            <button
              onClick={() => togglePlugin(plugin.id)}
              className="selector-pill"
              style={{
                borderColor: plugin.enabled ? 'var(--success)' : 'var(--border)',
                color: plugin.enabled ? 'var(--success)' : 'var(--text-muted)',
              }}
            >
              {plugin.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
