/**
 * Contratos da camada de Conversa.
 *
 * Esta é a "porta" (abstração) que isola a interface de QUEM produz as
 * respostas. No Sprint 2 a implementação é local e não responde nada. No
 * Sprint 3, o Core do BeeHive entrará por trás deste mesmo contrato —
 * sem que a interface precise mudar (Princípio P7 / desacoplamento).
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Epoch em milissegundos. */
  timestamp: number;
}

/** Callbacks para a resposta em streaming. */
export interface StreamHandlers {
  /** Chamado a cada pedaço de texto recebido. */
  onDelta: (text: string) => void;
  /** Chamado em caso de erro (servidor/Ollama fora, etc.). */
  onError: (message: string) => void;
}

export interface ConversationService {
  /**
   * Gera a resposta em streaming, repassando os pedaços via `handlers`.
   * Resolve quando termina (ou é cancelado/erro). Cancelar = abortar `signal`.
   *
   * `conversationId` (Sprint 18): identifica a conversa para o Runtime manter
   * memória entre mensagens (histórico automático, do lado do servidor) —
   * implementações que não têm memória própria podem simplesmente ignorá-lo.
   */
  respond(
    conversationId: string,
    userMessage: ChatMessage,
    history: ChatMessage[],
    handlers: StreamHandlers,
    signal?: AbortSignal,
  ): Promise<void>;
}
