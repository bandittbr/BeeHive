"use client";

import { useState, useEffect, useCallback } from "react";

export interface Conversation {
  id: string;
  title: string;
  projectId: string;
  model: string;
  reasoningEffort: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    role: string;
    content: string;
    createdAt: string;
  } | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  reasoningEffort?: string;
  createdAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  nextCursor?: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor?: string;
}

export function useConversations(projectId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const fetchConversations = useCallback(async (append = false) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (nextCursor && append) params.set("cursor", nextCursor);
      params.set("limit", "20");

      const res = await fetch(`/api/conversations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      
      const data: ConversationsResponse = await res.json();
      
      if (append) {
        setConversations(prev => [...prev, ...data.conversations]);
      } else {
        setConversations(data.conversations);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId, nextCursor]);

  useEffect(() => {
    if (projectId) {
      setConversations([]);
      setNextCursor(undefined);
      fetchConversations(false);
    }
  }, [projectId, fetchConversations]);

  const loadMore = useCallback(() => {
    if (!loading && nextCursor) {
      fetchConversations(true);
    }
  }, [loading, nextCursor, fetchConversations]);

  const createConversation = useCallback(async (title: string, model: string, reasoningEffort: string) => {
    if (!projectId) return null;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, model, reasoningEffort }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      
      const data = await res.json();
      setConversations(prev => [data.conversation, ...prev]);
      return data.conversation;
    } catch (err) {
      console.error("Error creating conversation:", err);
      return null;
    }
  }, [projectId]);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete conversation");
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  }, []);

  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update conversation");
      
      const data = await res.json();
      setConversations(prev => prev.map(c => c.id === id ? data.conversation : c));
    } catch (err) {
      console.error("Error updating conversation:", err);
    }
  }, []);

  return {
    conversations,
    loading,
    error,
    hasMore: !!nextCursor,
    loadMore,
    fetchConversations,
    createConversation,
    deleteConversation,
    updateConversation,
  };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const fetchMessages = useCallback(async (append = false) => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (nextCursor && append) params.set("cursor", nextCursor);
      params.set("limit", "50");

      const res = await fetch(`/api/conversations/${conversationId}/messages?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      
      const data: MessagesResponse = await res.json();
      
      if (append) {
        setMessages(prev => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [conversationId, nextCursor]);

  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setNextCursor(undefined);
      fetchMessages(false);
    } else {
      setMessages([]);
    }
  }, [conversationId, fetchMessages]);

  const sendMessage = useCallback(async (role: "user" | "assistant", content: string, model?: string, reasoningEffort?: string) => {
    if (!conversationId) return null;

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, model, reasoningEffort }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      return data.message;
    } catch (err) {
      console.error("Error sending message:", err);
      return null;
    }
  }, [conversationId]);

  return {
    messages,
    loading,
    error,
    hasMore: !!nextCursor,
    loadMore: () => {
      if (!loading && nextCursor) fetchMessages(true);
    },
    sendMessage,
  };
}