"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, FilePlus, X, AlertCircle, CheckCircle, Loader2, Search, ChevronDown, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileOperation {
  id: string;
  type: "read" | "write";
  path: string;
  content?: string;
  status: "pending" | "completed" | "error";
  error?: string;
}

interface FileOperationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  attachedFiles?: File[];
  onFileAttach?: (files: FileList) => void;
  onRemoveFile?: (index: number) => void;
  fileOperations?: FileOperation[];
  onFileOperation?: (op: { type: "read" | "write"; path: string; content?: string }) => void;
  onRemoveOperation?: (id: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function FileOperationInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Digite sua mensagem... (Shift+Enter para nova linha, @arquivo.txt para ler, @arquivo.txt:conteúdo para escrever)",
  attachedFiles = [],
  onFileAttach,
  onRemoveFile,
  fileOperations = [],
  onFileOperation,
  onRemoveOperation,
  onKeyDown,
}: FileOperationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const [searchModel, setSearchModel] = useState('');
  const [showFileOps, setShowFileOps] = useState(false);
  const [showFileOpPanel, setShowFileOpPanel] = useState(false);

  const models = [
    { id: 'opencode:big-pickle', name: 'opencode:big-pickle', provider: 'OpenCode', supportsImages: false },
    { id: 'openrouter:gpt-4o', name: 'GPT-4o', provider: 'OpenRouter', supportsImages: true },
    { id: 'openrouter:claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'OpenRouter', supportsImages: true },
    { id: 'openrouter:gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'OpenRouter', supportsImages: true },
    { id: 'ollama:llama3', name: 'Llama 3', provider: 'Ollama', supportsImages: false },
    { id: 'ollama:mistral', name: 'Mistral', provider: 'Ollama', supportsImages: false },
  ];

  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  const effortOptions = [
    { value: 'default', label: 'Padrão', desc: 'Balanceado' },
    { value: 'low', label: 'Low', desc: 'Rápido, menos tokens' },
    { value: 'medium', label: 'Medium', desc: 'Equilibrado' },
    { value: 'high', label: 'High', desc: 'Mais profundo, mais tokens' },
  ];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + 'px';
    }
  }, [value]);

  const currentModel = models.find(m => m.id === selectedModel);
  const supportsImages = currentModel?.supportsImages ?? false;
  const imageFiles = attachedFiles.filter(f => f.type.startsWith('image/'));
  const hasUnsupportedImages = imageFiles.length > 0 && !supportsImages;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sending && (input.trim() || attachedFiles.length > 0)) onSubmit();
    }
    onKeyDown?.(e);
  };

  const handleFileAttach = (files: FileList) => {
    const newFiles = Array.from(files);
    setAttachedFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      setFileOperations(prev => [...prev, { id: String(Date.now()) + Math.random(), name: f.name, type: 'read' }]);
    });
    setShowFileOps(true);
  };

  // Parse file operations from input text
  const parseFileOps = useCallback((text: string) => {
    const ops: { type: "read" | "write"; path: string; content?: string }[] = [];
    
    // Match @file.txt:content (write) or @file.txt (read)
    const writeRegex = /@([^\s:]+):([^\s]+)/g;
    const readRegex = /@([^\s:]+)(?:\s|$)/g;
    
    // Find write operations first (@file.txt:content)
    let writeMatch;
    while ((writeMatch = writeRegex.exec(text)) !== null) {
      ops.push({ type: "write", path: writeMatch[1], content: writeMatch[2] });
    }
    
    // Find read operations (@file.txt) - but not already matched as write
    let readMatch;
    const writePaths = ops.map(op => op.path);
    while ((readMatch = readRegex.exec(text)) !== null) {
      const path = readMatch[1];
      if (!writePaths.includes(path)) {
        ops.push({ type: "read", path });
      }
    }
    
    return ops;
  }, []);

  // Extract file operations from input before sending
  const handleSend = async () => {
    const ops = parseFileOps(value);
    for (const op of ops) {
      onFileOperation?.(op);
    }
    onSubmit();
  };

  return (
    <div className="chat-input-area">
      {/* Attached files chips */}
      {attachedFiles.length > 0 && (
        <div className="attached-files-bar">
          {attachedFiles.map((f, i) => (
            <span key={i} className={`attached-file-chip${f.type.startsWith('image/') && !supportsImages ? ' unsupported' : ''}`}>
              {f.type.startsWith('image/') ? <Image size={12} /> : <FileText size={12} />}
              {f.name}
              {f.type.startsWith('image/') && !supportsImages && <span className="unsupported-badge" title="Modelo não suporta imagens">⚠</span>}
              <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      
      {/* Unsupported images warning */}
      {hasUnsupportedImages && (
        <div className="model-warning">
          <AlertTriangle size={14} />
          <span>O modelo <strong>{currentModel?.name}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.</span>
        </div>
      )}

      {/* File Operations Panel */}
      {(fileOperations.length > 0 || showFileOps) && (
        <div className="file-ops-bar">
          <div className="file-ops-header">
            <span className="file-ops-title">Operações de Arquivo</span>
            <div className="file-ops-actions">
              <button className="file-op-btn" onClick={() => setShowFileOps(!showFileOps)} title={showFileOps ? "Ocultar" : "Mostrar"}>
                {showFileOps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button className="file-op-btn" onClick={() => setShowFileOpPanel(true)} title="Nova operação">
                <FilePlus size={14} />
              </button>
            </div>
          </div>
          {showFileOps && (
            <div className="file-ops-list">
              {fileOperations.map((op, i) => (
                <div key={op.id} className={`file-op-item ${op.status}`}>
                  <div className="file-op-header">
                    <span className={`file-op-type ${op.type}`}>{op.type === "read" ? "Ler" : "Escrever"}</span>
                    <span className="file-op-path">{op.path}</span>
                    <span className={`file-op-status ${op.status}`}>
                      {op.status === "pending" && <Loader2 size={12} />}
                      {op.status === "completed" && <CheckCircle size={12} />}
                      {op.status === "error" && <AlertCircle size={12} />}
                    </span>
                  </div>
                  {op.content && op.status === "completed" && (
                    <details className="file-op-content">
                      <summary>Ver conteúdo</summary>
                      <pre>{op.content}</pre>
                    </details>
                  )}
                  {op.error && <div className="file-op-error"><AlertCircle size={12} /> {op.error}</div>}
                  <div className="file-op-actions">
                    {op.status === "error" && <button className="file-op-btn" onClick={() => {/* retry */}} title="Tentar novamente"><RotateCcw size={12} /></button>}
                    <button className="file-op-btn" onClick={() => onRemoveOperation?.(fileOperations[i].id)} title="Remover"><X size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unsupported images warning */}
      {hasUnsupportedImages && (
        <div className="model-warning">
          <AlertTriangle size={14} />
          <span>O modelo <strong>{currentModel?.name}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.</span>
        </div>
      )}

      {/* Single unified input bubble - OpenWork style */}
      <div className="input-bubble">
        <div className="input-row">
          {/* Left: Attach button */}
          <div className="input-left">
            <button className="input-btn" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo" aria-label="Anexar arquivo">
              <FilePlus size={18} />
            </button>
            <input type="file" ref={fileInputRef} multiple onChange={e => e.target.files && handleFileAttach(e.target.files)} style={{ display: 'none' }} />
          </div>
          
          {/* Center: Textarea - fills available space */}
          <div className="input-center">
            <textarea
              ref={textareaRef}
              placeholder={sending ? 'Aguardando resposta...' : placeholder}
              value={value}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
              spellCheck={false}
            />
          </div>
          
          {/* Right: Send button */}
          <div className="input-right">
            <button className="chat-send-btn" onClick={handleSend} disabled={disabled || sending || (!value.trim() && attachedFiles.length === 0)} aria-label="Enviar">
              <Send size={18} />
            </button>
          </div>
        </div>
        
        {/* Controls row below: Model + Reasoning */}
        <div className="input-controls-row">
          <div className="input-controls">
            {/* Model Picker */}
            <div className="dropdown-group">
              <button className="dropdown-btn" onClick={() => { setSearchModel(''); setModelOpen(!modelOpen); }} title="Selecionar modelo">
                <BrainCircuit size={16} />
                <span>{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
                <ChevronDown size={12} />
              </button>
              {modelOpen && (
                <div className="dropdown-menu model-dropdown">
                  <input
                    type="text"
                    placeholder="Buscar modelo..."
                    value={searchModel}
                    onChange={e => setSearchModel(e.target.value)}
                    className="dropdown-search"
                    autoFocus
                  />
                  {Object.entries(modelsByProvider).map(([provider, providerModels]) => {
                    const filtered = providerModels.filter(m => 
                      m.name.toLowerCase().includes(searchModel.toLowerCase()) ||
                      m.provider.toLowerCase().includes(searchModel.toLowerCase())
                    );
                    if (filtered.length === 0) return null;
                    return (
                      <div key={provider} className="model-provider-group">
                        <div className="model-provider-label">{provider}</div>
                        {filtered.map(m => (
                          <button key={m.id} className={`dropdown-item${selectedModel === m.id ? ' active' : ''}`} onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}>
                            <span className="dropdown-item-name">{m.name}</span>
                            {!m.supportsImages && <span className="dropdown-item-warning" title="Não suporta imagens">⚠</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reasoning Effort */}
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
    </div>
  );
}