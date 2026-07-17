import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Globe, Send, Camera, FileText } from 'lucide-react';

interface ActionLog {
  id: string;
  action: string;
  target: string;
  time: string;
  status: 'success' | 'pending' | 'error';
}

const MOCK_LOG: ActionLog[] = [
  { id: '1', action: 'navigate', target: 'https://example.com', time: '14:32', status: 'success' },
  { id: '2', action: 'scrape', target: 'https://example.com/data', time: '14:30', status: 'success' },
  { id: '3', action: 'screenshot', target: 'https://example.com', time: '14:28', status: 'success' },
];

export default function BrowserPage() {
  const [url, setUrl] = useState('https://');
  const [logs, setLogs] = useState<ActionLog[]>(MOCK_LOG);
  const [actionType, setActionType] = useState<'navigate' | 'scrape' | 'screenshot'>('navigate');

  const executeAction = () => {
    if (!url.trim()) return;
    const newLog: ActionLog = {
      id: Date.now().toString(),
      action: actionType,
      target: url,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'success',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Browser</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chat-panel" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([
                { id: 'navigate' as const, icon: Globe, label: 'Navigate' },
                { id: 'scrape' as const, icon: FileText, label: 'Scrape' },
                { id: 'screenshot' as const, icon: Camera, label: 'Screenshot' },
              ]).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActionType(a.id)}
                  className="selector-pill"
                  style={{
                    borderColor: actionType === a.id ? 'var(--primary)' : 'var(--border)',
                    color: actionType === a.id ? 'var(--primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  <a.icon size={13} />
                  {a.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="chat-input-box"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <button className="input-send-btn" onClick={executeAction} style={{ width: 40, height: 40, flexShrink: 0 }}>
                <Send size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Action Log</h3>
            {logs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhuma ação registrada
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--primary-light)', fontFamily: 'monospace', minWidth: 70 }}>{log.action}</span>
                  <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.target}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
