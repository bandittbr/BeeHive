import { type KeyboardEvent } from 'react';
import { Icon } from '@/components/common/Icon';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** True quando ESTA conversa está gerando resposta (mostra o botão parar). */
  isResponding: boolean;
  onStop: () => void;
}

/**
 * Campo de mensagem da Conversa (controlado pelo pai).
 *
 * O texto vive no componente pai, para que o fluxo de "Começar/Esperar" possa
 * preservá-lo. Enter envia; Shift+Enter quebra linha. Enquanto esta conversa
 * responde, a seta de enviar vira botão de parar.
 */
export function MessageComposer({ value, onChange, onSubmit, isResponding, onStop }: MessageComposerProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isResponding) onSubmit();
    }
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isResponding) onSubmit();
      }}
    >
      <textarea
        className="composer__input"
        placeholder="Digite sua mensagem..."
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className="composer__toolbar">
        <div className="composer__tools">
          <button type="button" className="composer__tool">
            <Icon name="plus" size={18} />
            <span>Anexar</span>
          </button>
          <button type="button" className="composer__tool">
            <Icon name="command" size={18} />
            <span>Comandos</span>
          </button>
          <button type="button" className="composer__tool">
            <Icon name="agents" size={18} />
            <span>Agentes</span>
          </button>
        </div>

        <div className="composer__send-group">
          <button type="button" className="composer__icon" aria-label="Falar">
            <Icon name="mic" size={18} />
          </button>
          {isResponding ? (
            <button
              type="button"
              className="composer__send composer__send--stop"
              aria-label="Parar"
              onClick={onStop}
            >
              <Icon name="stop" size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="composer__send"
              aria-label="Enviar mensagem"
              disabled={value.trim().length === 0}
            >
              <Icon name="send" size={18} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
