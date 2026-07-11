import { useCallback, useEffect, useState } from 'react';
import { CONVERSATION_COMMANDS, type MessagePayload, type SendMessageResult } from '@beehive/platform/browser';
import { getRuntimeClient } from './runtimeClient';

/**
 * Bridge de UI para a Conversa via Runtime remoto.
 *
 * É o "A UI apenas envia e recebe": `send` DESPACHA um Command (HTTP) no
 * Runtime hospedado em `apps/api`; `messages` é atualizado a partir dos
 * EVENTOS emitidos pelo ConversationService, entregues por WebSocket. A UI
 * não conhece o Service nem o Kernel diretamente — fala só com o
 * `RuntimeClient` (Sprint 12: a Web é cliente, não mais o host do Kernel).
 */
export function useConversationBridge() {
  const [messages, setMessages] = useState<MessagePayload[]>([]);

  useEffect(() => {
    const client = getRuntimeClient();
    const append = (payload: MessagePayload) => setMessages((prev) => [...prev, payload]);
    const offReceived = client.on<MessagePayload>('MessageReceived', (e) => append(e.payload));
    const offSent = client.on<MessagePayload>('MessageSent', (e) => append(e.payload));
    return () => {
      offReceived();
      offSent();
    };
  }, []);

  const send = useCallback((text: string): Promise<SendMessageResult> => {
    return getRuntimeClient().dispatch<SendMessageResult>({
      type: CONVERSATION_COMMANDS.sendMessage,
      payload: { text },
    });
  }, []);

  return { messages, send };
}
