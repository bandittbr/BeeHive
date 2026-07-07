import { createContext, useContext, type ReactNode } from 'react';
import type { ConversationService } from './types';

/**
 * Injeção de dependência do serviço de conversa.
 * OBRIGATÓRIO prover um ConversationService via ConversationServiceProvider.
 * Lança erro em tempo de desenvolvimento se nenhum serviço for injetado,
 * evitando falhas silenciosas.
 */
const ConversationServiceContext = createContext<ConversationService>(null as unknown as ConversationService);

interface ProviderProps {
  service: ConversationService;
  children: ReactNode;
}

export function ConversationServiceProvider({ service, children }: ProviderProps) {
  return (
    <ConversationServiceContext.Provider value={service}>
      {children}
    </ConversationServiceContext.Provider>
  );
}

export function useConversationService(): ConversationService {
  const ctx = useContext(ConversationServiceContext);
  if (!ctx) {
    throw new Error(
      'Nenhum ConversationService foi injetado. Envolva a árvore com <ConversationServiceProvider service={...}>.',
    );
  }
  return ctx;
}
