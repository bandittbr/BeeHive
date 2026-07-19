"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, CopyCheck, Loader2, RotateCcw, Code, MessageSquare, Bot, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  agent?: string;
  streaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  isLast?: boolean;
}

function MessageBubble({ message, onCopy, onRegenerate, isLast }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(message.content);
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  };

  const renderContent = (content: string) => {
    // Simple markdown parsing for code blocks
    const parts = content.split(/```(\w+)?\n([\s\S]*?)```/g);
    return parts.map((part, index) => {
      if (index % 3 === 0) {
        // Regular text - render with simple markdown
        return (
          <div key={index} className="message-text">
            {part.split("\n").map((line, i) => (
              <div key={i} className="message-line">{line}</div>
            ))}
          </div>
        );
      }
      if (index % 3 === 1) {
        // Language
        return null;
      }
      // Code block
      const language = parts[index - 1];
      const code = part;
      return (
        <div key={index} className="code-block">
          <div className="code-block-header">
            <span className="code-language">{language || "text"}</span>
            <div className="code-actions">
              <button
                className="code-action-btn"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  // Show copied toast
                }}
                title="Copiar"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <pre><code className={`language-${language || "text"}`}>{code}</code></pre>
        </div>
      );
    };
  };

  if (!message) return null;

  return (
    <div className={`message-bubble ${message.role} ${message.streaming ? "streaming" : ""}`}>
      <div className="message-avatar">
        {message.role === "user" ? <Users size={16} /> : <Bot size={16} />}
      </div>
      <div className="message-content-wrapper">
        <div className="message-header">
          <span className="message-role">
            {message.role === "user" ? "Você" : message.agent || "BeeHive"}
          </span>
          <span className="message-time">{message.time}</span>
        </div>
        <div className="message-content">
          {renderContent(message.content)}
        </div>
        <div className="message-actions">
          <button
            className="message-action-btn"
            onClick={() => navigator.clipboard.writeText(message.content)}
            title="Copiar"
            aria-label="Copiar mensagem"
          >
            {copied ? <CopyCheck size={14} className="copied" /> : <Copy size={14} />}
          </button>
          {message.role === "assistant" && (
            <button
              className="message-action-btn"
              onClick={() => {} /* handleRegenerate(message.id) */}
              title="Regenerar"
              aria-label="Regenerar resposta"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  onRegenerate?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  streaming?: boolean;
  onScroll?: () => void;
}

export function MessageList({ messages, onRegenerate, onCopy, streaming, onScroll }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    onScroll?.();
  };

  return (
    <div 
      ref={listRef} 
      className="message-list" 
      onScroll={handleScroll}
    >
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          onRegenerate={onRegenerate}
          onCopy={(content) => navigator.clipboard.writeText(content)}
          isLast={index === messages.length - 1}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="message-bubble assistant typing">
      <div className="message-avatar"><Bot size={16} /></div>
      <div className="message-content-wrapper">
        <div className="message-content typing">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>
    </div>
  );
}

// Streaming message component
interface StreamingMessageProps {
  content: string;
  onComplete?: () => void;
}

export function StreamingMessage({ content, onComplete }: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!content) return;
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < content.length) {
        setDisplayedContent(content.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, 15); // Adjust speed as needed

    return () => clearInterval(interval);
  }, [content, onComplete]);

  return (
    <div className="message-bubble assistant streaming">
      <div className="message-avatar"><Bot size={16} /></div>
      <div className="message-content-wrapper">
        <div className="message-content">
          <span>{displayedContent}</span>
          {isComplete ? null : <span className="cursor">|</span>}
        </div>
      </div>
    </div>
  );
}

// Code block with syntax highlighting (using simple CSS)
export function CodeBlock({ language, code, onCopy }: { language: string; code: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language || "text"}</span>
        <button 
          className={`copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          aria-label="Copiar código"
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre><code className={`language-${language}`}>{code}</code></pre>
    </div>
  );
}

// Regenerate button component
interface RegenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function RegenerateButton({ onClick, disabled, loading }: RegenerateButtonProps) {
  return (
    <button
      className={`regenerate-btn ${disabled ? "disabled" : ""} ${loading ? "loading" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Regenerar resposta"
    >
      <RotateCcw size={14} className={loading ? "spin" : ""} />
      <span>{loading ? "Regenerando..." : "Regenerar"}</span>
    </button>
  );
}

// Copy button for messages
interface CopyButtonProps {
  content: string;
  onCopied?: () => void;
}

export function CopyButton({ content, onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopied?.();
  };

  return (
    <button
      className={`copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      aria-label="Copiar conteúdo"
    >
      {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
    </button>
  );
}

// Message input with streaming support
interface StreamingInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  streaming?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function StreamingInput({ 
  value, 
  onChange, 
  onSubmit, 
  disabled, 
  placeholder = "Digite sua mensagem... (Shift+Enter para nova linha)",
  streaming,
  onKeyDown
}: StreamingInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  };

  return (
    <div className="streaming-input-wrapper">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { handleKeyDown(e); onKeyDown?.(e); }}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="streaming-textarea"
        aria-label="Mensagem"
      />
    </div>
  );
}

export type { Message };