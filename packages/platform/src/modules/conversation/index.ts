import type { KernelContext } from '../../kernel';
import { BaseModule } from '../BaseModule';
import {
  ConversationService,
  conversationService,
  CONVERSATION_SERVICE_ID,
} from './ConversationService';
import {
  CONVERSATION_COMMANDS,
  type CancelStreamPayload,
  type ClearConversationPayload,
  type ConversationHistoryPayload,
  type SendMessagePayload,
  type SendMessageStreamPayload,
} from './commands';

/**
 * Módulo Conversa — o primeiro módulo REAL do BeeHive.
 *
 * Ele NÃO contém regra de negócio: apenas registra o Service, o Command e um
 * observador de evento. Toda a lógica está no ConversationService. A ligação
 * com o Service é feita por descoberta no Kernel (getService), nunca por
 * acoplamento direto entre módulos.
 */
export class ConversationModule extends BaseModule {
  readonly id = 'conversation';
  readonly name = 'Conversa';
  readonly version = '0.1.0';
  readonly description = 'Interface principal do BeeHive.';

  registerServices(context: KernelContext): void {
    context.registerService(conversationService.id, conversationService);
  }

  registerCommands(context: KernelContext): void {
    context.registerCommand(CONVERSATION_COMMANDS.sendMessage, (payload, kernel) => {
      const service = kernel.getService<ConversationService>(CONVERSATION_SERVICE_ID);
      if (!service) throw new Error('ConversationService indisponível');
      const { text, conversationId } = (payload ?? {}) as SendMessagePayload;
      return service.handleSendMessage(text ?? '', { conversationId });
    });

    // Sprint 17: inicia uma resposta em streaming — os pedaços saem por
    // eventos (MessageStream*) enquanto este comando ainda está pendente; o
    // resultado só chega quando termina (mesma semântica de sendMessage).
    context.registerCommand(CONVERSATION_COMMANDS.sendMessageStream, (payload, kernel) => {
      const service = kernel.getService<ConversationService>(CONVERSATION_SERVICE_ID);
      if (!service) throw new Error('ConversationService indisponível');
      const { text, id, conversationId, files } = (payload ?? {}) as SendMessageStreamPayload;
      return service.handleSendMessageStream(text ?? '', { id, conversationId, files });
    });

    // Sprint 17: cancela um streaming em andamento por `id` — o caminho para
    // quem despachou sendMessageStream por HTTP (sem AbortSignal vivo).
    context.registerCommand(CONVERSATION_COMMANDS.cancelStream, (payload, kernel) => {
      const service = kernel.getService<ConversationService>(CONVERSATION_SERVICE_ID);
      if (!service) throw new Error('ConversationService indisponível');
      const { id } = (payload ?? {}) as CancelStreamPayload;
      service.cancelStream(id ?? '');
      return { ok: true };
    });

    // Sprint 18: limpa o histórico (memória de sessão) de uma conversa.
    context.registerCommand(CONVERSATION_COMMANDS.clear, async (payload, kernel) => {
      const service = kernel.getService<ConversationService>(CONVERSATION_SERVICE_ID);
      if (!service) throw new Error('ConversationService indisponível');
      const { conversationId } = (payload ?? {}) as ClearConversationPayload;
      await service.clearConversation(conversationId ?? '');
      return { ok: true };
    });

    // Sprint 18: consulta o histórico (memória de sessão) de uma conversa.
    context.registerCommand(CONVERSATION_COMMANDS.history, async (payload, kernel) => {
      const service = kernel.getService<ConversationService>(CONVERSATION_SERVICE_ID);
      if (!service) throw new Error('ConversationService indisponível');
      const { conversationId } = (payload ?? {}) as ConversationHistoryPayload;
      const messages = await service.getHistory(conversationId ?? '');
      return { conversationId: conversationId ?? '', messages };
    });
  }

  registerEvents(context: KernelContext): void {
    // Observa eventos apenas para log/coordenação — sem regra de negócio.
    context.events.on('MessageSent', (event) => {
      context.logger.debug('Conversa: resposta enviada', { payload: event.payload });
    });
  }
}

export const conversationModule = new ConversationModule();
