"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Copy, CopyCheck, Loader2, RotateCcw, Code, MessageSquare, Bot, Users,
  FileText, FilePlus, Download, X, AlertCircle, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingMessage, CodeBlock, RegenerateButton, CopyButton } from "./StreamingComponents";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  agent?: string;
  streaming?: boolean;
  attachedFiles?: FileOperation[];
}

interface FileOperation {
  id: string;
  type: "read" | "write";
  path: string;
  content?: string;
  status: "pending" | "completed" | "error";
  error?: string;
}

interface MessageBubbleProps {
  message: any;
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
        <CodeBlock key={index} language={language || "text"} code={code} />
      );
    });
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
        
        {/* File operations display */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="file-operations">
            {message.attachedFiles.map((op) => (
              <div key={op.id} className={`file-op ${op.type} ${op.status}`}>
                <div className="file-op-header">
                  <FileText size={12} />
                  <span className="file-op-type">
                    {op.type === "read" ? "Lendo" : "Escrevendo"}
                  </span>
                  <span className="file-op-path">{op.path}</span>
                  <span className={`file-op-status ${op.status}`}>
                    {op.status === "pending" && <Loader2 size={12} />}
                    {op.status === "completed" && <CheckCircle size={12} />}
                    {op.status === "error" && <AlertCircle size={12} />}
                  </span>
                </div>
                {op.error && <div className="file-op-error">{op.error}</div>}
                {op.status === "completed" && op.content && (
                  <details className="file-op-content">
                    <summary>Ver conteúdo</summary>
                    <pre>{op.content}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="message-actions">
          <CopyButton content={message.content} />
          {message.role === "assistant" && (
            <RegenerateButton onClick={() => {}} disabled={false} loading={false} />
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: any[];
  onRegenerate?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  streaming?: boolean;
  onScroll?: () => void;
}

export function MessageList({ messages, onRegenerate, onCopy, streaming, onScroll }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          onCopy={onCopy}
          isLast={index === messages.length - 1}
        />
      ))}
      <div ref={messagesEndRef} />
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
    }, 15);

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language || "text"}</span>
        <button 
          className={`code-action-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title="Copiar"
        >
          {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
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

// Streaming input with file operations support
interface StreamingInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  streaming?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileAttach?: (files: FileList) => void;
  attachedFiles?: File[];
  onRemoveFile?: (index: number) => void;
}

export function StreamingInput({ 
  value, 
  onChange, 
  onSubmit, 
  disabled, 
  placeholder = "Digite sua mensagem... (Shift+Enter para nova linha)",
  streaming,
  onKeyDown,
  onFileAttach,
  attachedFiles,
  onRemoveFile
}: StreamingInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);

  const models = [
    { id: 'opencode:big-pickle', name: 'opencode:big-pickle', provider: 'OpenCode', supportsImages: false },
    { id: 'openrouter:gpt-4o', name: 'GPT-4o', provider: 'OpenRouter', supportsImages: true },
    { id: 'openrouter:claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'OpenRouter', supportsImages: true },
    { id: 'openrouter:gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'OpenRouter', supportsImages: true },
    { id: 'ollama:llama3', name: 'Llama 3', provider: 'Ollama', supportsImages: false },
    { id: 'ollama:mistral', name: 'Mistral', provider: 'Ollama', supportsImages: false },
  ];

  const effortOptions = [
    { value: 'default', label: 'Padrão', desc: 'Balanceado' },
    { value: 'low', label: 'Low', desc: 'Rápido, menos tokens' },
    { value: 'medium', label: 'Medium', desc: 'Equilibrado' },
    { value: 'high', label: 'High', desc: 'Mais profundo, mais tokens' },
  ];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && (value.trim() || attachedFiles.length > 0)) onSubmit();
    }
  };

  const handleFileAttach = (files: FileList) => {
    const newFiles = Array.from(files);
    // Process file operations (@file.txt or @file.txt:content)
    newFiles.forEach(f => {
      // Could add file operation parsing here
    });
  };

  return (
    <div className="chat-input-area">
      {/* Attached files chips */}
      {attachedFiles && attachedFiles.length > 0 && (
        <div className="attached-files-bar">
          {attachedFiles.map((f, i) => (
            <span key={i} className={`attached-file-chip ${f.type.startsWith('image/') ? 'unsupported' : ''}`}>
              {f.type.startsWith('image/') ? <Image size={12} /> : <FileText size={12} />}
              {f.name}
              {f.type.startsWith('image/') && !f.supportsImages && (
                <span className="unsupported-badge">⚠</span>
              )}
              <button onClick={() => onRemoveFile?.(i)}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
{hasUnsupportedImages && (
        <div className="model-warning">
          <AlertTriangle size={14} />
          <span>
            O modelo <strong>{currentModel?.name}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.
          </span>
        </div>
      )}
      
      {/* Main input row */}
      <div className="input-row">
        <div className="input-left">
          <button className="input-btn" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo" aria-label="Anexar arquivo">
            <FilePlus size={18} />
          </button>
          <input type="file" ref={fileInputRef} multiple onChange={e => e.target.files && handleFileAttach(e.target.files)} style={{ display: 'none' }} />
        </div>
        <div className="input-center">
          <textarea
            ref={textareaRef}
            placeholder={streaming ? 'Aguardando resposta...' : 'Digite sua mensagem... (Shift+Enter para nova linha)'}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            spellCheck={false}
          />
        </div>
        <div className="input-right">
          <div className="dropdown-group">
            <button className="dropdown-btn" onClick={() => setModelOpen(!modelOpen)} title="Selecionar modelo">
              <BrainCircuit size={16} />
              <span>{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
              <ChevronDown size={12} />
            </button>
            {modelOpen && (
              <div className="dropdown-menu model-dropdown">
                {models.map(m => (
                  <button key={m.id} className={`dropdown-item${selectedModel === m.id ? ' active' : ''}`} onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}>
                    <span className="dropdown-item-name">{m.name}</span>
                    <span className="dropdown-item-provider">{m.provider}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="dropdown-group">
            <button className="dropdown-btn" onClick={() => setEffortOpen(!effortOpen)} title="Esforço de raciocínio">
              <SlidersHorizontal size={16} />
              <span>{effortOptions.find(e => e.value === reasoningEffort)?.label || 'Padrão'}</span>
              <ChevronDown size={12} />
            </button>
            {effortOpen && (
              <div className="dropdown-menu effort-dropdown">
                {effortOptions.map(e => (
                  <button key={e.value} className={`dropdown-item${reasoningEffort === e.value ? ' active' : ''}`} onClick={() => { setReasoningEffort(e.value as any); setEffortOpen(false); }}>
                    <span className="dropdown-item-name">{e.label}</span>
                    <span className="dropdown-item-desc">{e.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="chat-send-btn" onClick={onSubmit} disabled={streaming || (!value.trim() && !attachedFiles?.length)}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Controls row: Model + Reasoning below textarea */}
      <div className="input-controls-row">
        <div className="input-left-spacer" style={{ width: '40px' }} />
        <div className="input-controls">
          <div className="dropdown-group">
            <button className="dropdown-btn" onClick={() => setModelOpen(!modelOpen)} title="Selecionar modelo">
              <BrainCircuit size={16} />
              <span>{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
              <ChevronDown size={12} />
            </button>
            {modelOpen && (
              <div className="dropdown-menu model-dropdown">
                {models.map(m => (
                  <button key={m.id} className={`dropdown-item${selectedModel === m.id ? ' active' : ''}`} onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}>
                    <span className="dropdown-item-name">{m.name}</span>
                    <span className="dropdown-item-provider">{m.provider}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="dropdown-group">
            <button className="dropdown-btn" onClick={() => setEffortOpen(!effortOpen)} title="Esforço de raciocínio">
              <SlidersHorizontal size={16} />
              <span>{effortOptions.find(e => e.value === reasoningEffort)?.label || 'Padrão'}</span>
              <ChevronDown size={12} />
            </button>
            {effortOpen && (
              <div className="dropdown-menu effort-dropdown">
                {effortOptions.map(e => (
                  <button key={e.value} className={`dropdown-item${reasoningEffort === e.value ? ' active' : ''}`} onClick={() => { setReasoningEffort(e.value as any); setEffortOpen(false); }}>
                    <span className="dropdown-item-name">{e.label}</span>
                    <span className="dropdown-item-desc">{e.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}