import { useState } from 'react';
import { ScrollText, XCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  level: 'error' | 'warn' | 'info';
  message: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: '1', time: '14:32:01', level: 'info', message: 'Workflow "Marketing Diário" iniciado' },
  { id: '2', time: '14:31:45', level: 'info', message: 'Agente "Marketing Agent" conectado ao provider' },
  { id: '3', time: '14:30:12', level: 'warn', message: 'OpenRouter: latência acima do normal (2.4s)' },
  { id: '4', time: '14:29:55', level: 'info', message: 'Browser scraping concluído: 14 páginas' },
  { id: '5', time: '14:28:30', level: 'error', message: 'Trade BTC workflow: conexão perdida com exchange' },
  { id: '6', time: '14:27:10', level: 'info', message: 'Model "Claude Sonnet" selecionado como padrão' },
  { id: '7', time: '14:25:00', level: 'warn', message: 'Memory plugin: cache atingiu 80% da capacidade' },
  { id: '8', time: '14:22:15', level: 'info', message: 'Backup automático realizado com sucesso' },
];

const LEVEL_ICON: Record<string, typeof Info> = {
  error: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const LEVEL_COLOR: Record<string, string> = {
  error: 'var(--danger)',
  warn: 'var(--warning)',
  info: 'var(--text-muted)',
};

export default function LogsPage() {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [logs, setLogs] = useState(MOCK_LOGS);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  const clearLogs = () => setLogs([]);

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Logs</h2>
        <div className="chat-selectors">
          {(['all', 'error', 'warn', 'info'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className="selector-pill"
              style={{
                borderColor: filter === level ? 'var(--primary)' : 'var(--border)',
                color: filter === level ? 'var(--primary-light)' : 'var(--text-secondary)',
              }}
            >
              {level === 'all' ? 'All' : level.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          maxHeight: 400,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginTop: 8,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhum log encontrado
          </div>
        ) : (
          filtered.map((log) => {
            const Icon = LEVEL_ICON[log.level];
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                }}
              >
                <Icon size={14} style={{ color: LEVEL_COLOR[log.level], marginTop: 2, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {log.time}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={clearLogs}
        className="ver-todas-btn"
        style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Trash2 size={13} />
        Clear logs
      </button>
    </div>
  );
}
