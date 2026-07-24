import type { Conversation, Message } from '../types';
import { useAppStore } from '../stores/appStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const chatService = {
  async getConversations(projectId: string): Promise<Conversation[]> {
    await delay(150);
    return useAppStore.getState().conversations.filter(c => c.projectId === projectId);
  },

  async createConversation(data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    await delay(200);
    const conv: Conversation = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useAppStore.getState().addConversation(conv);
    return conv;
  },

  async renameConversation(id: string, title: string): Promise<void> {
    await delay(100);
    useAppStore.getState().updateConversation(id, { title, updatedAt: new Date().toISOString() });
  },

  async toggleFavorite(id: string): Promise<void> {
    await delay(100);
    const conv = useAppStore.getState().conversations.find(c => c.id === id);
    if (conv) useAppStore.getState().updateConversation(id, { starred: !conv.starred });
  },

  async deleteConversation(id: string): Promise<void> {
    await delay(100);
    useAppStore.getState().deleteConversation(id);
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    await delay(100);
    return useAppStore.getState().messages.filter(m => m.conversationId === conversationId);
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    await delay(300);
    const msg: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addMessage(msg);

    await delay(1500);
    const reply: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role: 'assistant',
      content: `Recebido: "${content.substring(0, 50)}..."\n\nProcessando sua solicitaçào com sucesso.`,
      agent: 'AI Agent',
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addMessage(reply);
    return reply;
  },
};

