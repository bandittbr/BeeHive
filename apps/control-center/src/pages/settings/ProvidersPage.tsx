import { useAppStore } from '../../stores/appStore';
import { providerService } from '../../services/provider.service';
import { Plug, PlugZap, Plus, Server } from 'lucide-react';

export default function ProvidersPage() {
  const { providers, updateProvider } = useAppStore();

  const handleToggle = async (id: string, currentStatus: string) => {
    if (currentStatus === 'connected') {
      await providerService.disconnect(id);
    } else {
      await providerService.connect(id);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Providers</h2>
        <div className="chat-selectors">
          <button className="selector-pill">
            <PlugZap size={14} />
            <span>{providers.filter((p) => p.status === 'connected').length} conectados</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {providers.map((provider) => (
          <div
            key={provider.id}
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
                  background: provider.status === 'connected' ? 'var(--success-muted)' : 'var(--surface-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: provider.status === 'connected' ? 'var(--success)' : 'var(--text-muted)',
                }}
              >
                <Server size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{provider.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}: {provider.models.join(', ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggle(provider.id, provider.status)}
              className="selector-pill"
              style={{
                borderColor: provider.status === 'connected' ? 'var(--success)' : 'var(--border)',
                color: provider.status === 'connected' ? 'var(--success)' : 'var(--text-secondary)',
              }}
            >
              {provider.status === 'connected' ? <PlugZap size={13} /> : <Plug size={13} />}
              <span>{provider.status === 'connected' ? 'Connected' : 'Connect'}</span>
            </button>
          </div>
        ))}
      </div>

      <button className="ver-todas-btn" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Plus size={14} />
        Add Provider
      </button>
    </div>
  );
}
