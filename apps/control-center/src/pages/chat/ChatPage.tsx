import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { chatService } from '../../services/chat.service';
import { Plus, Star, MoreHorizontal, Trash2, Pencil, Send } from 'lucide-react';
import ChatMessage from './ChatMessage';

export default function ChatPage() {
  const navigate = useNavigate();
  const { id: conversationId } = useParams<{ id: string }>();

  const conversations = useAppStore((s) => s.conversations);
  const currentProject = useAppStore((s) => s.currentProject);
  const messages = useAppStore((s) => s.messages);
  const providers = useAppStore((s) => s.providers);
  const models = useAppStore((s) => s.models);
  const currentProvider = useAppStore((s) => s.currentProvider);
  const currentModel = useAppStore((s) => s.currentModel);
  const setCurrentProvider = useAppStore((s) => s.setCurrentProvider);
  const setCurrentModel = useAppStore((s) => s.setCurrentModel);

  const [input, setInput] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = currentProject
    ? conversations.filter((c) => c.projectId === currentProject.id)
    : conversations;

  const activeMessages = conversationId
    ? messages.filter((m) => m.conversationId === conversationId)
    : [];

  const activeConversation = conversationId
    ? conversations.find((c) => c.id === conversationId)
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  const handleNewChat = async () => {
    const conv = await chatService.createConversation({
      title: 'Nova conversa',
      preview: '',
      projectId: currentProject?.id ?? '',
      starred: false,
    });
    navigate(`/chat/${conv.id}`);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId) return;
    setInput('');
    await chatService.sendMessage(conversationId, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRename = async (convId: string) => {
    if (renameValue.trim()) {
      await chatService.renameConversation(convId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = async (convId: string) => {
    if (!confirm('Excluir esta conversa?')) return;
    await chatService.deleteConversation(convId);
    navigate('/chat');
  };

  return (
    <div className="page" style={{ display: 'flex', height: '100%', padding: 0 }}>
      {/* ── Sidebar ── */}
      <aside className="chat-sidebar" style={{ width: 280, borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: 'var(--panel-bg)' }}>
        <div className="page-header" style={{ padding: '18px 16px 12px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Conversas</h2>
        </div>
        <div className="page-actions" style={{ padding: '0 16px 14px' }}>
          <button
            onClick={handleNewChat}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '9px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Nova conversa
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {filteredConversations.map((c) => (
            <div
              key={c.id}
              className={`conversation-card ${c.id === conversationId ? 'conversation-active' : ''}`}
              style={{
                position: 'relative',
                padding: '10px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: c.id === conversationId ? 'var(--surface-2)' : 'transparent',
                marginBottom: 2,
                transition: 'background 0.15s ease',
              }}
              onClick={() => navigate(`/chat/${c.id}`)}
            >
              {renamingId === c.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(c.id)}
                  style={{
                    width: '100%', background: 'var(--surface-3)', border: '1px solid var(--primary)',
                    borderRadius: 4, padding: '4px 6px', color: 'var(--text)', fontSize: 12.5, outline: 'none',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {c.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                      {c.starred && <Star size={12} fill="var(--warning)" stroke="var(--warning)" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.preview}
                  </div>
                </>
              )}

              {/* Context menu */}
              {menuOpen === c.id && (
                <div
                  style={{
                    position: 'absolute', top: '100%', right: 8, zIndex: 20,
                    background: 'var(--surface-3)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: 4, minWidth: 150,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setRenamingId(c.id); setRenameValue(c.title); setMenuOpen(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                  >
                    <Pencil size={13} /> Renomear
                  </button>
                  <button
                    onClick={async () => { await chatService.toggleFavorite(c.id); setMenuOpen(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                  >
                    <Star size={13} /> {c.starred ? 'Desfavoritar' : 'Favoritar'}
                  </button>
                  <button
                    onClick={() => { handleDelete(c.id); setMenuOpen(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div className="chat-layout" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {activeConversation?.title ?? 'Chat'}
          </h2>
          <div className="select-field" style={{ display: 'flex', gap: 8 }}>
            <select
              className="select"
              value={currentProvider?.id ?? ''}
              onChange={(e) => {
                const p = providers.find((pr) => pr.id === e.target.value);
                if (p) setCurrentProvider(p);
              }}
              style={{
                padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, outline: 'none',
              }}
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              className="select"
              value={currentModel?.id ?? ''}
              onChange={(e) => {
                const m = models.find((md) => md.id === e.target.value);
                if (m) setCurrentModel(m);
              }}
              style={{
                padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, outline: 'none',
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!conversationId ? (
            <div className="chat-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <div className="chat-empty-mark" style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#fff' }}>
                <Send size={22} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Selecione uma conversa</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ou inicie uma nova conversa</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  agent={msg.agent}
                  createdAt={msg.createdAt}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        {conversationId && (
          <div className="chat-input-bar" style={{ padding: '14px 24px', borderTop: '1px solid var(--border-light)' }}>
            <div
              className="chat-input"
              style={{
                display: 'flex', alignItems: 'flex-end', gap: 10,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '12px 14px',
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 14, resize: 'none', lineHeight: 1.5,
                  fontFamily: 'inherit', minHeight: 20, maxHeight: 120,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  width: 32, height: 32, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: input.trim() ? 'var(--gradient)' : 'var(--surface-3)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  color: input.trim() ? '#fff' : 'var(--text-muted)',
                  cursor: input.trim() ? 'pointer' : 'default',
                  transition: 'all 0.18s ease',
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
