"use client"

import * as React from "react"

export interface DispatchAction {
  target: "settings"
  action: "open"
  section: "commands" | "skills" | "mcps" | "plugins" | "providers"
}

interface MessageListContextValue {
  showThinking: boolean
  highlightQuery?: string
  developerMode: boolean
  displaySuggestions: boolean
  providerConnectedCount: number
  dispatchAction: (action: DispatchAction) => void
  setPrompt: (prompt: string) => void
  onRevertToUserMessage: (messageId: string) => void
  onForkAtMessage: (messageId: string) => void
  onEditUserMessage: (messageId: string, text: string) => void
}

const MessageListContext = React.createContext<MessageListContextValue | null>(null)

interface MessageListProviderProps {
  children: React.ReactNode
  showThinking?: boolean
  highlightQuery?: string
  developerMode?: boolean
  displaySuggestions?: boolean
  providerConnectedCount?: number
  dispatchAction?: (action: DispatchAction) => void
  setPrompt?: (prompt: string) => void
  onRevertToUserMessage?: (messageId: string) => void
  onForkAtMessage?: (messageId: string) => void
  onEditUserMessage?: (messageId: string, text: string) => void
}

export function MessageListProvider({
  children,
  showThinking = false,
  highlightQuery,
  developerMode = false,
  displaySuggestions = true,
  providerConnectedCount = 0,
  dispatchAction = () => {},
  setPrompt = () => {},
  onRevertToUserMessage = () => {},
  onForkAtMessage = () => {},
  onEditUserMessage = () => {},
}: MessageListProviderProps) {
  const value = React.useMemo(
    () => ({
      showThinking,
      highlightQuery,
      developerMode,
      displaySuggestions,
      providerConnectedCount,
      dispatchAction,
      setPrompt,
      onRevertToUserMessage,
      onForkAtMessage,
      onEditUserMessage,
    }),
    [
      showThinking, highlightQuery, developerMode, displaySuggestions,
      providerConnectedCount, dispatchAction, setPrompt,
      onRevertToUserMessage, onForkAtMessage, onEditUserMessage,
    ],
  )

  return (
    <MessageListContext.Provider value={value}>
      {children}
    </MessageListContext.Provider>
  )
}

export function useMessageList() {
  const context = React.useContext(MessageListContext)
  if (!context) {
    throw new Error("useMessageList must be used within a MessageListProvider")
  }
  return context
}
