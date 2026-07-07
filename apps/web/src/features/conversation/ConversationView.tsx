import { useState } from 'react';
import { WelcomeHero } from './components/WelcomeHero';
import { ActionCards } from './components/ActionCards';
import { QuickSuggestions } from './components/QuickSuggestions';
import { MessageComposer } from './components/MessageComposer';
import { MessageList } from './components/MessageList';
import { HistoryPanel } from './components/HistoryPanel';
import { useConversations } from './ConversationStore';
import { Button, Modal } from '@/components/ui';
import './ConversationView.css';

/**
 * Área Conversa — a interface principal do BeeHive.
 *
 * Consome o store de conversas (estado elevado e persistente). Trata o caso de
 * conflito: se outra conversa está gerando e o usuário tenta enviar aqui,
 * abre um aviso com "Começar aqui" (pausa a outra) ou "Esperar".
 */
export function ConversationView() {
  const {
    conversations,
    activeId,
    activeMessages,
    respondingId,
    sendMessage,
    stop,
    newConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
  } = useConversations();

  const [value, setValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  const isRespondingHere = respondingId !== null && respondingId === activeId;
  const isBusyElsewhere = respondingId !== null && respondingId !== activeId;
  const hasMessages = activeMessages.length > 0;

  const trySubmit = () => {
    const text = value.trim();
    if (text.length === 0) return;
    if (isBusyElsewhere) {
      setConflictOpen(true);
      return;
    }
    sendMessage(text);
    setValue('');
  };

  const pickSuggestion = (text: string) => {
    setValue(text);
    if (isBusyElsewhere) {
      setConflictOpen(true);
      return;
    }
    sendMessage(text);
    setValue('');
  };

  // "Começar aqui": pausa a conversa em andamento e envia esta.
  const startHere = () => {
    setConflictOpen(false);
    stop();
    const text = value.trim();
    if (text.length > 0) {
      sendMessage(text);
      setValue('');
    }
  };

  return (
    <div className="conversation">
      <section className="conversation__main">
        {hasMessages && (
          <header className="conversation__bar">
            <span className="conversation__bar-title">Conversa</span>
            <Button variant="ghost" size="sm" icon="plus" onClick={newConversation}>
              Nova conversa
            </Button>
          </header>
        )}

        <div className="conversation__scroll">
          {hasMessages ? (
            <div className="conversation__thread">
              <MessageList messages={activeMessages} />
            </div>
          ) : (
            <div className="conversation__welcome">
              <WelcomeHero />
              <ActionCards />
            </div>
          )}
        </div>

        <div className="conversation__composer-area">
          <MessageComposer
            value={value}
            onChange={setValue}
            onSubmit={trySubmit}
            isResponding={isRespondingHere}
            onStop={stop}
          />
          {!hasMessages && <QuickSuggestions onPick={pickSuggestion} />}
        </div>
      </section>

      <HistoryPanel
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onRequestDelete={setPendingDelete}
        onRename={renameConversation}
      />

      {/* Aviso de conflito: outra conversa está gerando resposta. */}
      <Modal
        open={conflictOpen}
        title="Já existe uma conversa em andamento"
        onClose={() => setConflictOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConflictOpen(false)}>
              Esperar
            </Button>
            <Button variant="primary" onClick={startHere}>
              Começar aqui
            </Button>
          </>
        }
      >
        Já existe um chat gerando uma resposta. Deseja pausá-lo e começar aqui, ou esperar ele
        terminar? Sua mensagem fica salva no campo caso prefira esperar.
      </Modal>

      {/* Confirmação de exclusão de conversa. */}
      <Modal
        open={pendingDelete !== null}
        title="Apagar conversa"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) deleteConversation(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Apagar
            </Button>
          </>
        }
      >
        Apagar esta conversa do histórico? Esta ação não pode ser desfeita.
      </Modal>
    </div>
  );
}
