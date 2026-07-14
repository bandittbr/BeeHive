import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon, type IconName } from '@/components/common/Icon';
import { EmptyState } from '@/components/ui';
import { API_BASE } from '@/lib/api';

type ActivityType = 'terminal' | 'file' | 'git' | 'browser' | 'ai' | 'system';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timestamp: Date;
  status?: 'success' | 'error' | 'running';
}

const TYPE_ICONS: Record<ActivityType, IconName> = {
  terminal: 'command',
  file: 'folder',
  git: 'git',
  browser: 'globe',
  ai: 'sparkles',
  system: 'gear',
};

const TYPE_COLORS: Record<ActivityType, string> = {
  terminal: '#10b981',
  file: '#3b82f6',
  git: '#f59e0b',
  browser: '#8b5cf6',
  ai: '#ec4899',
  system: '#6b7280',
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s atr\u00e1s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m atr\u00e1s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h atr\u00e1s`;
}

/**
 * ActivityPanel — painel de atividade em tempo real.
 *
 * Mostra comandos executados, arquivos criados/modificados,
 * atividade git, browser, e interações com a AI.
 * Estilo OpenCode/OpenWork.
 */
export function ActivityPanel() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const addActivity = useCallback((type: ActivityType, title: string, detail: string, status?: ActivityItem['status']) => {
    const item: ActivityItem = {
      id: `act-${nextId.current++}`,
      type,
      title,
      detail,
      timestamp: new Date(),
      status,
    };
    setActivities(prev => [item, ...prev].slice(0, 100)); // mantém 100 recentes
  }, []);

  // Escuta eventos do runtime via polling (simplificado)
  useEffect(() => {
    let cancelled = false;

    const pollActivities = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/runtime/logs`);
        if (res.ok) {
          const logs = await res.json() as Array<{ level: string; message: string; timestamp: string }>;
          // Pega os últimos 5 logs como atividade
          const recent = logs.slice(-5);
          for (const log of recent) {
            const type = detectActivityType(log.message);
            addActivity(type, log.level.toUpperCase(), log.message.slice(0, 120));
          }
        }
      } catch {
        // Ignora erros de polling
      }
    };

    // Poll a cada 10s
    const interval = setInterval(pollActivities, 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [addActivity]);

  // Escuta eventos de terminal (comandos executados)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { command, output } = e.detail ?? {};
      addActivity('terminal', command ?? 'Comando', output?.slice(0, 100) ?? '', 'success');
    };
    window.addEventListener('terminal:executed' as any, handler);
    return () => window.removeEventListener('terminal:executed' as any, handler);
  }, [addActivity]);

  // Escuta eventos de arquivo
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { filename, action } = e.detail ?? {};
      addActivity('file', action ?? 'Arquivo', filename ?? '', 'success');
    };
    window.addEventListener('file:modified' as any, handler);
    return () => window.removeEventListener('file:modified' as any, handler);
  }, [addActivity]);

  // Escuta eventos de git
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { action, detail } = e.detail ?? {};
      addActivity('git', action ?? 'Git', detail ?? '', 'success');
    };
    window.addEventListener('git:action' as any, handler);
    return () => window.removeEventListener('git:action' as any, handler);
  }, [addActivity]);

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  return (
    <aside className="activity-panel">
      <div className="activity-panel__header">
        <h3 className="activity-panel__title">
          <Icon name="activity" size={16} />
          Atividade
        </h3>
      </div>

      <div className="activity-panel__filters">
        <button
          className={`activity-panel__filter ${filter === 'all' ? 'activity-panel__filter--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        <button
          className={`activity-panel__filter ${filter === 'terminal' ? 'activity-panel__filter--active' : ''}`}
          onClick={() => setFilter('terminal')}
        >
          <Icon name="command" size={12} /> Terminal
        </button>
        <button
          className={`activity-panel__filter ${filter === 'file' ? 'activity-panel__filter--active' : ''}`}
          onClick={() => setFilter('file')}
        >
          <Icon name="folder" size={12} /> Arquivos
        </button>
        <button
          className={`activity-panel__filter ${filter === 'git' ? 'activity-panel__filter--active' : ''}`}
          onClick={() => setFilter('git')}
        >
          <Icon name="git" size={12} /> Git
        </button>
        <button
          className={`activity-panel__filter ${filter === 'ai' ? 'activity-panel__filter--active' : ''}`}
          onClick={() => setFilter('ai')}
        >
          <Icon name="sparkles" size={12} /> AI
        </button>
      </div>

      <div className="activity-panel__list" ref={scrollRef}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="activity"
            title="Nenhuma atividade"
            description="Comandos, arquivos e ações aparecerão aqui em tempo real."
          />
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="activity-item">
              <div className="activity-item__icon" style={{ color: TYPE_COLORS[item.type] }}>
                <Icon name={TYPE_ICONS[item.type]} size={14} />
              </div>
              <div className="activity-item__content">
                <div className="activity-item__header">
                  <span className="activity-item__title">{item.title}</span>
                  <span className="activity-item__time">{timeAgo(item.timestamp)}</span>
                </div>
                <div className="activity-item__detail">{item.detail}</div>
                {item.status && (
                  <span className={`activity-item__status activity-item__status--${item.status}`}>
                    {item.status === 'success' ? 'OK' : item.status === 'error' ? 'Erro' : '...'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function detectActivityType(message: string): ActivityType {
  const lower = message.toLowerCase();
  if (lower.includes('terminal') || lower.includes('command') || lower.includes('exec')) return 'terminal';
  if (lower.includes('file') || lower.includes('write') || lower.includes('read')) return 'file';
  if (lower.includes('git') || lower.includes('commit') || lower.includes('push')) return 'git';
  if (lower.includes('browser') || lower.includes('navigate')) return 'browser';
  if (lower.includes('ai') || lower.includes('model') || lower.includes('stream')) return 'ai';
  return 'system';
}
