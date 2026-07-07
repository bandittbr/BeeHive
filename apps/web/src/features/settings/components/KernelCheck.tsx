import { useState } from 'react';
import { Button, Input, Panel } from '@/components/ui';
import { useConversationBridge } from '@/app/useConversationBridge';
import './KernelCheck.css';

/**
 * Verificação visível da arquitetura (Kernel → Módulo → Serviço → Event Bus).
 *
 * A UI apenas ENVIA um Command e RECEBE por eventos — não conhece o Service.
 * Resposta simulada (sem IA). Serve para provar, na tela, que toda a fundação
 * está integrada.
 */
export function KernelCheck() {
  const { messages, send } = useConversationBridge();
  const [text, setText] = useState('');

  const onSend = () => {
    const value = text.trim();
    if (value.length === 0) return;
    void send(value);
    setText('');
  };

  return (
    <Panel title="Verificação da arquitetura (Kernel → Módulo → Serviço)">
      <p className="kernel-check__hint">
        Envia um <strong>Command</strong> pelo Kernel; a resposta chega por <strong>Eventos</strong>{' '}
        do ConversationService (simulada, sem IA).
      </p>

      <div className="kernel-check__row">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite e envie um comando..."
        />
        <Button variant="primary" onClick={onSend} disabled={text.trim().length === 0}>
          Enviar
        </Button>
      </div>

      <div className="kernel-check__log">
        {messages.length === 0 ? (
          <span className="kernel-check__empty">Nenhuma mensagem ainda.</span>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`kernel-check__msg kernel-check__msg--${message.role}`}>
              <span className="kernel-check__role">{message.role}</span>
              {message.text}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
