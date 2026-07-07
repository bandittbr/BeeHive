import { useEffect, useRef } from 'react';
import { Loading } from '@/components/ui';
import { MarkdownMessage } from './MarkdownMessage';
import type { ChatMessage } from '@/services/conversation/types';

interface MessageListProps {
  messages: ChatMessage[];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Lista de mensagens, com rolagem automática para a última.
 *
 * Uma mensagem de assistente ainda vazia (durante o streaming, antes do 1º
 * token) é mostrada como indicador de digitação; depois, o texto vai crescendo.
 */
export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  return (
    <div className="messages">
      {messages.map((message) => {
        const isStreaming = message.role === 'assistant' && message.content === '';
        return (
          <div key={message.id} className={`message message--${message.role}`}>
            <div className={`message__bubble${isStreaming ? ' message__bubble--typing' : ''}`}>
              {isStreaming ? (
                <Loading variant="dots" label="Gerando" />
              ) : message.role === 'assistant' ? (
                <MarkdownMessage content={message.content} />
              ) : (
                <span className="message__text">{message.content}</span>
              )}
            </div>
            <time className="message__time">{formatTime(message.timestamp)}</time>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
