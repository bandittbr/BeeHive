import { useState } from 'react';
import { User, CheckCircle2 } from 'lucide-react';
import { settingsService } from '../../services/provider.service';

export default function ProfilePage() {
  const [name, setName] = useState('Gabriel T.');
  const [email, setEmail] = useState('gabriel@beehive.ai');
  const [role, setRole] = useState('Admin');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await settingsService.update({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Profile</h2>
        <div className="chat-selectors">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12.5 }}>
            <User size={14} />
            Gerencie suas informações
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="chat-input-box"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="chat-input-box"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="chat-input-box"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="input-send-btn" onClick={handleSave} style={{ width: 'auto', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
            {saved ? <CheckCircle2 size={14} /> : null}
            {saved ? 'Saved' : 'Save'}
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} />
              Perfil atualizado com sucesso
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
