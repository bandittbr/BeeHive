"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Copy, CopyCheck, Loader2, RotateCcw, Code, MessageSquare, Bot, Users,
  FileText, FilePlus, Download, X, AlertCircle, Send,
  BrainCircuit, SlidersHorizontal, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingMessage, CodeBlock, RegenerateButton, CopyButton } from "./StreamingComponents";
import { ModelSelect } from "./ModelSelector";
import { ReasoningEffortSelect } from "./ReasoningEffortSelect";
import {
  isBashToolPart, isEditToolPart, isWriteToolPart, isReadToolPart,
  isGrepToolPart, isGlobToolPart, isApplyPatchToolPart, isSkillToolPart,
  isTodoWriteToolPart, isWebFetchToolPart, isWebSearchToolPart,
  isQuestionToolPart, isTaskToolPart,
  type AnyToolPart, type DynamicToolUIPart,
} from "@/lib/tool-types";
import { BashTool } from "@/components/tools/bash";
import { EditTool } from "@/components/tools/edit";
import { ReadFileTool, WriteFileTool } from "@/components/tools/file";
import { GlobTool } from "@/components/tools/glob";
import { GrepTool } from "@/components/tools/grep";
import { WebfetchTool } from "@/components/tools/webfetch";
import { WebsearchTool } from "@/components/tools/websearch";
import { QuestionTool } from "@/components/tools/question";
import { TodoWriteTool } from "@/components/tools/todowrite";
import { SkillTool } from "@/components/tools/skill";
import { ApplyPatchTool } from "@/components/tools/apply-patch";
import { Tool } from "@/components/ui/tool";
import { McpToolRenderer } from "@/components/tools/mcp-tool";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  agent?: string;
  streaming?: boolean;
  attachedFiles?: FileOperation[];
  parts?: AnyToolPart[];
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

function ToolMessageInner({ part }: { part: DynamicToolUIPart }) {
  if (isBashToolPart(part)) return <BashTool part={part} />;
  if (isEditToolPart(part)) return <EditTool part={part} />;
  if (isWriteToolPart(part)) return <WriteFileTool part={part} />;
  if (isReadToolPart(part)) return <ReadFileTool part={part} />;
  if (isGrepToolPart(part)) return <GrepTool part={part} />;
  if (isGlobToolPart(part)) return <GlobTool part={part} />;
  if (isApplyPatchToolPart(part)) return <ApplyPatchTool part={part} />;
  if (isSkillToolPart(part)) return <SkillTool part={part} />;
  if (isTodoWriteToolPart(part)) return <TodoWriteTool part={part} />;
  if (isWebFetchToolPart(part)) return <WebfetchTool part={part} />;
  if (isWebSearchToolPart(part)) return <WebsearchTool part={part} />;
  if (isQuestionToolPart(part)) return <QuestionTool part={part} />;
  if (isTaskToolPart(part)) return <Tool toolPart={part} />;
  return <McpToolRenderer part={part} />;
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

        {/* Tool parts */}
        {message.parts && message.parts.length > 0 && (
          <div className="tool-parts mt-2 space-y-1">
            {message.parts.filter((p): p is DynamicToolUIPart => p.type === "dynamic-tool").map((part) => (
              <ToolMessageInner key={part.toolCallId} part={part} />
            ))}
          </div>
        )}
        
        {/* File operations display */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="file-operations">
            {message.attachedFiles.map((op) => (
              <div key={op.id} className={`file-op ${op.status}`}>
                <span className="file-op-icon">
                  {op.type === "read" && <FileText size={12} />}
                  {op.type === "write" && <FilePlus size={12} />}
                </span>
                <span className="file-op-path">{op.path}</span>
                {op.error && <span className="file-op-error">{op.error}</span>}
              </div>
            ))}
          </div>
        )}
        
        {/* Actions on hover */}
        <div className="message-actions">
          <CopyButton onClick={handleCopy} copied={copied} />
          {message.role === "assistant" && isLast && (
            <RegenerateButton onClick={handleRegenerate} />
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  streaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

export function MessageList({ messages, streaming, onRegenerate, onCopy }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = useCallback((content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIds(prev => new Set(prev).add(messageId));
    setTimeout(() => {
      setCopiedIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }, 2000);
    onCopy?.(content);
  }, [onCopy]);

  const handleRegenerate = useCallback((messageId: string) => {
    onRegenerate?.(messageId);
  }, [onRegenerate]);

  return (
    <div className="chat-messages">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={(c) => handleCopy(c, message.id)}
          onRegenerate={handleRegenerate}
          isLast={index === messages.length - 1}
        />
      ))}
      {streaming && (
        <StreamingMessage />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface StreamingInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder?: string;
  streaming: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFileAttach?: (files: FileList) => void;
  attachedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  selectedModel?: string;
  setSelectedModel?: (v: string) => void;
  reasoningEffort?: 'default' | 'low' | 'medium' | 'high';
  setReasoningEffort?: (v: 'default' | 'low' | 'medium' | 'high') => void;
}

function StreamingInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Digite sua mensagem... (Shift+Enter para nova linha)",
  streaming,
  onKeyDown,
  onFileAttach,
  attachedFiles,
  onRemoveFile,
  selectedModel,
  setSelectedModel,
  reasoningEffort,
  setReasoningEffort
}: StreamingInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);

  const modelOptions = [
    { providerID: 'opencode', modelID: 'big-pickle', title: 'opencode:big-pickle', description: 'OpenCode', supportsImages: false },
    { providerID: 'openrouter', modelID: 'gpt-4o', title: 'GPT-4o', description: 'OpenRouter', supportsImages: true },
    { providerID: 'openrouter', modelID: 'claude-3.5-sonnet', title: 'Claude 3.5 Sonnet', description: 'OpenRouter', supportsImages: true },
    { providerID: 'openrouter', modelID: 'gemini-1.5-pro', title: 'Gemini 1.5 Pro', description: 'OpenRouter', supportsImages: true },
    { providerID: 'ollama', modelID: 'llama3', title: 'Llama 3', description: 'Ollama', supportsImages: false },
    { providerID: 'ollama', modelID: 'mistral', title: 'Mistral', description: 'Ollama', supportsImages: false },
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

  const currentModel = modelOptions.find(m => `${m.providerID}:${m.modelID}` === selectedModel);
  const supportsImages = currentModel?.supportsImages ?? false;
  const imageFiles = attachedFiles?.filter(f => f.type.startsWith('image/')) || [];
  const hasUnsupportedImages = imageFiles.length > 0 && !supportsImages;

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
            O modelo <strong>{currentModel?.title}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.
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
            <ModelSelect
              open={modelOpen}
              onOpenChange={setModelOpen}
              value={{ providerID: selectedModel?.split(':')[0] || 'opencode', modelID: selectedModel?.split(':')[1] || selectedModel }}
              onChange={(modelRef) => setSelectedModel?.(`${modelRef.providerID}:${modelRef.modelID}`)}
              options={modelOptions}
              placeholder="Select model"
            />
          </div>
          <div className="dropdown-group">
            <ReasoningEffortSelect
              value={reasoningEffort}
              label="Raciocínio"
              options={effortOptions}
              onChange={setReasoningEffort}
            />
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
          <ModelSelect
            open={modelOpen}
            onOpenChange={setModelOpen}
            value={{ providerID: selectedModel?.split(':')[0] || 'opencode', modelID: selectedModel?.split(':')[1] || selectedModel }}
            onChange={(modelRef) => setSelectedModel?.(`${modelRef.providerID}:${modelRef.modelID}`)}
            options={modelOptions}
            placeholder="Select model"
          />
          <ReasoningEffortSelect
            value={reasoningEffort}
            label="Raciocínio"
            options={effortOptions}
            onChange={setReasoningEffort}
          />
        </div>
      </div>
    </div>
  );
}

export function StreamingMessage() {
  return (
    <div className="msg assistant streaming">
      <div className="msg-avatar"><Bot size={16} /></div>
      <div className="msg-body">
        <div className="msg-header"><span className="msg-role">BeeHive</span></div>
        <div className="msg-content msg-typing">
          <span>P</span><span>e</span><span>n</span><span>s</span><span>a</span><span>n</span><span>d</span><span>o</span><span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
  );
}