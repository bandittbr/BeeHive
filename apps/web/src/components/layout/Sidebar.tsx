import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/common/Icon';
import { NAV_ITEMS } from '@/data/navigation';
import { useConversations } from '@/features/conversation/ConversationStore';
import './Sidebar.css';

interface SidebarProps {
  activeArea: string;
  onSelectArea: (id: string) => void;
  open: boolean;
}

const MAX_INITIAL_ITEMS = 5;

export function Sidebar({ activeArea, onSelectArea, open }: SidebarProps) {
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const historyRef = useRef<HTMLDivElement>(null);

  const { conversations, selectConversation } = useConversations();

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHistoryToggle = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryOpen(historyOpen === itemId ? null : itemId);
  };

  const handleSelectConversation = (convId: string) => {
    selectConversation(convId);
    onSelectArea('conversa');
    setHistoryOpen(null);
  };

  const getRecentItems = (areaId: string) => {
    if (areaId === 'conversa') {
      return conversations
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(c => ({
          id: c.id,
          label: c.title,
          timestamp: c.updatedAt,
        }));
    }
    // Para Business/Projetos - retorna vazio por enquanto
    return [];
  };

  const visibleItems = (areaId: string) => {
    const items = getRecentItems(areaId);
    return showAll[areaId] ? items : items.slice(0, MAX_INITIAL_ITEMS);
  };

  const hasMore = (areaId: string) => {
    return getRecentItems(areaId).length > MAX_INITIAL_ITEMS;
  };

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <img className="sidebar__logo" src="/beehive.svg" alt="" width={32} height={32} />
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">BeeHive</span>
          <span className="sidebar__brand-tag">Sistema Operacional de IA</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Áreas">
        <ul>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeArea;
            const hasHistory = item.id === 'conversa' || item.id === 'business';
            const isHistoryOpen = historyOpen === item.id;

            return (
              <li key={item.id} className="sidebar__nav-item">
                <div className="sidebar__item-row">
                  <button
                    type="button"
                    className={`sidebar__item${isActive ? ' sidebar__item--active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSelectArea(item.id)}
                  >
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                  </button>

                  {hasHistory && (
                    <button
                      type="button"
                      className={`sidebar__history-btn${isHistoryOpen ? ' sidebar__history-btn--active' : ''}`}
                      onClick={(e) => handleHistoryToggle(item.id, e)}
                      title="Histórico"
                    >
                      <Icon name="clock" size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown de histórico */}
                {isHistoryOpen && hasHistory && (
                  <div className="sidebar__history-dropdown" ref={historyRef}>
                    <div className="sidebar__history-header">
                      <span>Histórico</span>
                    </div>
                    <div className="sidebar__history-list">
                      {visibleItems(item.id).length === 0 ? (
                        <div className="sidebar__history-empty">Nenhum item recente</div>
                      ) : (
                        visibleItems(item.id).map((histItem) => (
                          <button
                            key={histItem.id}
                            type="button"
                            className="sidebar__history-item"
                            onClick={() => handleSelectConversation(histItem.id)}
                          >
                            <Icon name={item.icon} size={14} />
                            <span className="sidebar__history-item-label">{histItem.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {hasMore(item.id) && (
                      <button
                        type="button"
                        className="sidebar__history-more"
                        onClick={() => setShowAll(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      >
                        {showAll[item.id] ? 'Mostrar Menos' : 'Mostrar Mais...'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__user">
        <div className="sidebar__avatar" aria-hidden>
          A
        </div>
        <div className="sidebar__user-info">
          <span className="sidebar__user-name">Administrador</span>
          <span className="sidebar__user-plan">Plano Ultimate</span>
        </div>
      </div>
    </aside>
  );
}
