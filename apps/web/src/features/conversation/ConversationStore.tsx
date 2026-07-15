import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useConversationService } from '@/services/conversation/ConversationServiceContext';
import type { ChatMessage } from '@/services/conversation/types';

/**
 * Store de Conversas — estado ELEVADO e PERSISTENTE.
 *
 * Vive acima das Áreas (no topo do app), então trocar de menu NÃO reseta a
 * conversa. Guarda várias conversas, persistidas no navegador (localStorage),
 * de modo que sobrevivem a recarregar a página. "Nova" arquiva a atual no
 * histórico; apagar é a única forma de remover.
 *
 * A inteligência continua atrás da abstração de serviço (P7): o store fala com
 * `ConversationService`, não com nenhum provedor concreto.
 */

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  content: string;
}

interface ConversationStoreValue {
  conversations: Conversation[];
  activeId: string | null;
  activeMessages: ChatMessage[];
  /** Id da conversa que está gerando resposta agora, ou null. */
  respondingId: string | null;
  sendMessage: (content: string, files?: FileAttachment[]) => Promise<void>;
  stop: () => void;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
}

const STORAGE_KEY = 'beehive.conversations.v1';

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean || 'Nova conversa';
}

function loadState(): { conversations: Conversation[]; activeId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { conversations?: Conversation[]; activeId?: string | null };
      if (Array.isArray(parsed.conversations)) {
        return { conversations: parsed.conversations, activeId: parsed.activeId ?? null };
      }
    }
  } catch {
    // localStorage indisponível ou corrompido: começa vazio.
  }
  return { conversations: [], activeId: null };
}

const ConversationStoreContext = createContext<ConversationStoreValue | null>(null);

interface ConversationStoreProviderProps {
  children: ReactNode;
  /** Contexto do projeto local (arquivos) para injetar nas mensagens. */
  projectContext?: string;
}

export function ConversationStoreProvider({ children, projectContext }: ConversationStoreProviderProps) {
  const service = useConversationService();
  const initial = loadState();
  const [conversations, setConversations] = useState<Conversation[]>(initial.conversations);
  const [activeId, setActiveId] = useState<string | null>(initial.activeId);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Geração em andamento — usado para descartar a resposta ao parar.
  const pendingRef = useRef<{ convId: string | null; assistantId: string } | null>(null);

  // Persiste com debounce — evita stringify síncrono a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations, activeId }));
      } catch {
        // Sem persistência (ex.: modo privado): segue só em memória.
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [conversations, activeId]);

  const activeMessages = useMemo(
    () => conversations.find((c) => c.id === activeId)?.messages ?? [],
    [conversations, activeId],
  );

  const sendMessage = useCallback(
    async (content: string, files: FileAttachment[] = []) => {
      const text = content.trim();
      if (text.length === 0 && files.length === 0) return;

      const userMessage: ChatMessage = {
        id: newId('msg'),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        files: files.length > 0 ? files : undefined,
      };

      // Placeholder do assistente — preenchido ao vivo pelos pedaços do stream.
      const assistantId = newId('msg');
      const placeholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      // Determina a conversa-alvo (cria uma se não houver ativa).
      const current = conversations;
      let targetId: string;
      let history: ChatMessage[] = [];
      const existing = activeId ? current.find((c) => c.id === activeId) : undefined;

      if (existing) {
        targetId = existing.id;
        history = existing.messages;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? { ...c, messages: [...c.messages, userMessage, placeholder], updatedAt: Date.now() }
              : c,
          ),
        );
      } else {
        targetId = newId('conv');
        const conversation: Conversation = {
          id: targetId,
          title: titleFrom(text || `Arquivo: ${files[0]?.name}`),
          messages: [userMessage, placeholder],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations((prev) => [conversation, ...prev]);
        setActiveId(targetId);
      }

      // Atualiza a mensagem do assistente (acrescenta texto ou marca erro).
      const updateAssistant = (patch: (content: string) => Partial<ChatMessage>) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) =>
                    m.id === assistantId ? { ...m, ...patch(m.content) } : m,
                  ),
                }
              : c,
          ),
        );
      };

      pendingRef.current = { convId: targetId, assistantId };
      const controller = new AbortController();
      abortRef.current = controller;
      setRespondingId(targetId);
      try {
        await service.respond(
          targetId,
          userMessage,
          history,
          {
            onDelta: (chunk) => updateAssistant((value) => ({ content: value + chunk })),
            onError: (message) => updateAssistant(() => ({ role: 'system', content: message })),
          },
          controller.signal,
          projectContext,
        );
      } finally {
        // Só limpa se ainda for esta geração (evita corrida ao "Começar aqui").
        setRespondingId((value) => (value === targetId ? null : value));
        abortRef.current = null;
        pendingRef.current = null;
        // Remove placeholder vazio (ex.: cancelado antes do 1º token).
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  messages: c.messages.filter(
                    (m) => !(m.id === assistantId && m.role === 'assistant' && m.content === ''),
                  ),
                }
              : c,
          ),
        );
      }
    },
    [conversations, activeId, service, projectContext],
  );

  // Interrompe a resposta em andamento e DESCARTA o que já foi gerado.
  const stop = useCallback(() => {
    abortRef.current?.abort();
    const pending = pendingRef.current;
    if (pending) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === pending.convId
            ? { ...c, messages: c.messages.filter((m) => m.id !== pending.assistantId) }
            : c,
        ),
      );
      pendingRef.current = null;
    }
  }, []);

  const newConversation = useCallback(() => {
    // Apenas tira a conversa atual de foco; a nova se materializa no 1º envio.
    setActiveId(null);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    const clean = title.trim();
    if (clean.length === 0) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: clean } : c)),
    );
  }, []);

  const value = useMemo<ConversationStoreValue>(
    () => ({
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
    }),
    [
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
    ],
  );

  return (
    <ConversationStoreContext.Provider value={value}>{children}</ConversationStoreContext.Provider>
  );
}

export function useConversations(): ConversationStoreValue {
  const ctx = useContext(ConversationStoreContext);
  if (!ctx) {
    throw new Error('useConversations deve ser usado dentro de ConversationStoreProvider');
  }
  return ctx;
}
