import { useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/common/Icon';
import { EmptyState } from '@/components/ui';
import type { Conversation } from '../ConversationStore';

interface HistoryPanelProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRequestDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function lastPreview(conversation: Conversation): string {
  const last = conversation.messages[conversation.messages.length - 1];
  return last ? last.content : 'Sem mensagens';
}

/**
 * Painel de histórico: lista todas as conversas salvas. Clicar abre; "+ Nova"
 * começa outra; o lápis renomeia (inline); a lixeira apaga. O título editado é
 * salvo no store (e persiste).
 */
export function HistoryPanel({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRequestDelete,
  onRename,
}: HistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setDraft(conversation.title);
  };

  const commit = () => {
    if (editingId) onRename(editingId, draft);
    setEditingId(null);
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  return (
    <aside className="history">
      <div className="history__header">
        <h3 className="history__title">Histórico</h3>
        <button type="button" className="history__new" onClick={onNew}>
          <Icon name="plus" size={16} />
          <span>Nova</span>
        </button>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon="chat"
          title="Nenhuma conversa ainda"
          description="Suas conversas aparecerão aqui."
        />
      ) : (
        <div className="history__list">
          {conversations.map((conversation) => {
            const isEditing = editingId === conversation.id;
            return (
              <div
                key={conversation.id}
                className={`history__item${conversation.id === activeId ? ' history__item--active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isEditing) onSelect(conversation.id);
                }}
                onKeyDown={(e) => {
                  if (isEditing) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(conversation.id);
                  }
                }}
              >
                <span className="history__item-icon" aria-hidden>
                  <Icon name="chat" size={16} />
                </span>

                {isEditing ? (
                  <input
                    className="history__item-input"
                    autoFocus
                    value={draft}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onEditKeyDown}
                    onBlur={commit}
                  />
                ) : (
                  <div className="history__item-body">
                    <span className="history__item-title">{conversation.title}</span>
                    <span className="history__item-preview">{lastPreview(conversation)}</span>
                  </div>
                )}

                {!isEditing && (
                  <div className="history__item-actions">
                    <button
                      type="button"
                      className="history__item-action"
                      aria-label="Renomear conversa"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(conversation);
                      }}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="history__item-action history__item-action--delete"
                      aria-label="Apagar conversa"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelete(conversation.id);
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
