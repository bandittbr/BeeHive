import { useState } from 'react';
import { Palette, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { settingsService } from '../../services/provider.service';

const THEMES = [
  { id: 'dark' as const, label: 'Dark', desc: 'Tema escuro para ambientes com pouca luz' },
  { id: 'light' as const, label: 'Light', desc: 'Tema claro para uso diurno' },
  { id: 'system' as const, label: 'System', desc: 'Detectar automaticamente a preferência do sistema' },
];

export default function ThemePage() {
  const { settings, updateSettings } = useAppStore();
  const [current, setCurrent] = useState(settings.theme);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await settingsService.update({ theme: current });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Theme</h2>
        <div className="chat-selectors">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12.5 }}>
            <Palette size={14} />
            Atual: {settings.theme}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {THEMES.map((theme) => {
          const isSelected = current === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setCurrent(theme.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: isSelected ? 'var(--primary-muted)' : 'var(--surface-2)',
                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{theme.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{theme.desc}</div>
              </div>
              {isSelected && <CheckCircle2 size={18} style={{ color: 'var(--primary-light)' }} />}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button
          className="input-send-btn"
          onClick={handleSave}
          style={{ width: 'auto', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}
        >
          {saved ? <CheckCircle2 size={14} /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} />
            Tema atualizado com sucesso
          </span>
        )}
      </div>
    </div>
  );
}
