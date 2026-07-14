import type { ConversationService } from './types';
import { getRuntimeClient } from '@/app/runtimeClient';
import {
  CONVERSATION_COMMANDS,
  type MessageStreamChunkPayload,
  type MessageStreamCompletedPayload,
  type MessageStreamFailedPayload,
} from '@beehive/platform';

let seq = 0;
const nextRequestId = () => `stream-${Date.now()}-${seq++}`;

/**
 * Serviço de conversa conectado ao runtime via comandos e eventos de stream.
 * Mantém o contrato da UI e centraliza a integração com o WebSocket do runtime.
 */
export const runtimeConversationService: ConversationService = {
  respond(conversationId, userMessage, _history, handlers, signal, context) {
    const client = getRuntimeClient();
    const id = nextRequestId();

    const fullText = context
      ? `${context}\n\n---\n\n${userMessage.content}`
      : userMessage.content;

    return new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        unsubChunk();
        unsubCompleted();
        unsubFailed();
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      };

      const unsubChunk = client.on<MessageStreamChunkPayload>('MessageStreamChunk', (event) => {
        if (event.payload.id !== id) return;
        handlers.onDelta(event.payload.delta);
      });

      const unsubCompleted = client.on<MessageStreamCompletedPayload>(
        'MessageStreamCompleted',
        (event) => {
          if (event.payload.id !== id) return;
          finish();
        },
      );

      const unsubFailed = client.on<MessageStreamFailedPayload>('MessageStreamFailed', (event) => {
        if (event.payload.id !== id) return;
        handlers.onError(event.payload.error);
        finish();
      });

      const onAbort = () => {
        void client
          .dispatch({ type: CONVERSATION_COMMANDS.cancelStream, payload: { id } })
          .catch(() => {
            // Best-effort: mesmo se o cancelamento não chegar ao servidor, a
            // UI já para de esperar (finish() abaixo, quando o evento de
            // falha/conclusão chegar — ou nunca, se a conexão caiu de vez).
          });
      };
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort);
      }

      client
        .dispatch({
          type: CONVERSATION_COMMANDS.sendMessageStream,
          payload: { text: fullText, id, conversationId },
        })
        .catch((error: unknown) => {
          if (settled) return;
          handlers.onError(
            error instanceof Error
              ? error.message
              : 'Não consegui falar com o Runtime do BeeHive.',
          );
          finish();
        });
    });
  },
};
