import { useAppStore } from '../../stores/appStore';
import { Box, CheckCircle2 } from 'lucide-react';

export default function ModelsPage() {
  const { models, providers, currentModel, setCurrentModel } = useAppStore();

  const getProviderName = (providerId: string) =>
    providers.find((p) => p.id === providerId)?.name ?? providerId;

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Models</h2>
        <div className="chat-selectors">
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Current: <strong style={{ color: 'var(--primary-light)' }}>{currentModel?.name ?? 'None'}</strong>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {models.map((model) => {
          const isSelected = currentModel?.id === model.id;
          return (
            <button
              key={model.id}
              onClick={() => setCurrentModel(model)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                background: isSelected ? 'var(--primary-muted)' : 'var(--surface-2)',
                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--primary-muted)' : 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? 'var(--primary-light)' : 'var(--text-muted)',
                  }}
                >
                  <Box size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{model.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {getProviderName(model.provider)} — {(model.contextWindow / 1000).toFixed(0)}K context
                  </div>
                </div>
              </div>
              {isSelected && (
                <CheckCircle2 size={18} style={{ color: 'var(--primary-light)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
