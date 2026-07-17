import { Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  createdAt: string;
}

export default function ChatMessage({ role, content, agent, createdAt }: ChatMessageProps) {
  const isUser = role === 'user';
  const time = new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--gradient)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Bot size={12} color="#fff" />
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-light)' }}>
            {agent ?? 'Agent'}
          </span>
        </div>
      )}
      <div className="message-bubble">
        <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>{time}</span>
    </div>
  );
}
