"use client";

import { useState, useCallback } from "react";
import { FileText, Save, Loader2, X, AlertCircle, CheckCircle, Download, FolderOpen, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import "./FileOperations.css";

interface FileOperation {
  id: string;
  type: "read" | "write";
  path: string;
  content?: string;
  status: "pending" | "completed" | "error";
  error?: string;
  result?: string;
}

interface FileOperationsBarProps {
  operations: FileOperation[];
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onClear?: () => void;
}

export function FileOperationsBar({ 
  operations, 
  onRemove, 
  onRetry, 
  onClear 
}: FileOperationsBarProps) {
  if (operations.length === 0) return null;

  const pendingOps = operations.filter(op => op.status === "pending");
  const completedOps = operations.filter(op => op.status === "completed");
  const errorOps = operations.filter(op => op.status === "error");

  return (
    <div className="file-operations-bar">
      <div className="file-ops-header">
        <div className="file-ops-title">
          <FolderOpen size={16} />
          <span>Operações de Arquivo</span>
          <span className="ops-count">{operations.length}</span>
        </div>
        <div className="file-ops-actions">
          <button 
            className="file-op-btn ghost" 
            onClick={onClear}
            title="Limpar todas"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="file-ops-list">
        {operations.map((op) => (
          <div key={op.id} className={cn("file-op-item", `status-${op.status}`)}>
            <div className="file-op-header">
              <div className="file-op-icon">
                {op.type === "read" ? (
                  <FileText size={14} className={cn("text-blue-400", op.status === "pending" && "animate-spin")} />
                ) : (
                  <Save size={14} className={cn("text-green-400", op.status === "pending" && "animate-spin")} />
                )}
              </div>
              <div className="file-op-path">
                <span className="file-op-type">{op.type === "read" ? "Ler" : "Escrever"}</span>
                <span className="file-op-path-text">{op.path}</span>
              </div>
              <div className="file-op-status">
                {op.status === "pending" && <Loader2 size={14} className="text-yellow-400 animate-spin" />}
                {op.status === "completed" && <CheckCircle size={14} className="text-green-400" />}
                {op.status === "error" && <AlertCircle size={14} className="text-red-400" />}
              </div>
            </div>

            {op.status === "completed" && op.result && (
              <div className="file-op-result">
                <pre>{op.result.slice(0, 500)}{op.result.length > 500 ? "..." : ""}</pre>
                <div className="file-op-result-actions">
                  <button className="file-op-btn" onClick={() => navigator.clipboard.writeText(op.result || "")} title="Copiar">
                    <Copy size={12} />
                  </button>
                  {op.type === "read" && op.result && (
                    <button className="file-op-btn" onClick={() => {
                      const blob = new Blob([op.result || ""], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = op.path.split("/").pop() || "file.txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }} title="Baixar">
                    <Download size={12} />
                  </button>
                  )}
                </div>
              </div>
            )}

            {op.status === "error" && op.error && (
              <div className="file-op-error">
                <AlertCircle size={12} />
                <span>{op.error}</span>
              </div>
            )}

            <div className="file-op-actions">
              {op.status === "error" && onRetry && (
                <button className="file-op-btn retry" onClick={() => onRetry?.(op.id)} title="Tentar novamente">
                  <RotateCcw size={12} />
                  <span>Tentar novamente</span>
                </button>
              )}
              {onRemove && (
                <button className="file-op-btn danger" onClick={() => onRemove?.(op.id)} title="Remover">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(completedOps.length > 0 || errorOps.length > 0) && (
        <div className="file-ops-summary">
          {completedOps.length > 0 && (
            <span className="summary-item success">
              <CheckCircle size={12} /> {completedOps.length} concluído(s)
            </span>
          )}
          {errorOps.length > 0 && (
            <span className="summary-item error">
              <AlertCircle size={12} /> {errorOps.length} erro(s)
            </span>
          )}
          {pendingOps.length > 0 && (
            <span className="summary-item pending">
              <Loader2 size={12} className="animate-spin" /> {pendingOps.length} pendente(s)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface FileOperationInputProps {
  onFileOperation: (op: { type: "read" | "write"; path: string; content?: string }) => void;
  disabled?: boolean;
}

export function FileOperationInput({ onFileOperation, disabled }: FileOperationInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const parseInput = useCallback((value: string) => {
    // Parse @arquivo.txt (read) or @arquivo.txt:conteúdo (write)
    const readMatch = value.match(/^@(.+?)(?:\s|$)/);
    const writeMatch = value.match(/^@(.+?):(.+)$/);
    
    if (writeMatch) {
      return { type: "write" as const, path: writeMatch[1].trim(), content: writeMatch[2] };
    }
    if (readMatch) {
      return { type: "read" as const, path: readMatch[1].trim() };
    }
    return null;
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInput(inputValue);
    if (parsed) {
      onFileOperation(parsed);
      setInputValue("");
    }
  }, [inputValue, onFileOperation, parseInput]);

  return (
    <div className="file-op-input-wrapper">
      <form onSubmit={handleSubmit} className="file-op-form">
        <div className="file-op-input-wrapper">
          <label htmlFor="file-op-input" className="file-op-label">
            <span className="file-op-prefix">@</span>
            <input
              id="file-op-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setShowHelp(true)}
              onBlur={() => setTimeout(() => setShowHelp(false), 200)}
              placeholder="arquivo.txt ou arquivo.txt:conteúdo"
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
            />
            <button 
              type="submit" 
              className="file-op-submit"
              disabled={disabled || !inputValue.trim()}
              title="Enviar operação de arquivo"
            >
              <Send size={16} />
            </button>
          </label>
        </div>

        {showHelp && (
          <div className="file-op-help">
            <div className="help-item">
              <kbd>@arquivo.txt</kbd>
              <span>Ler arquivo</span>
            </div>
            <div className="help-item">
              <kbd>@arquivo.txt:conteúdo</kbd>
              <span>Escrever arquivo</span>
            </div>
            <div className="help-item">
              <kbd>@pasta/arquivo.txt</kbd>
              <span>Caminhos relativos</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// File operation result display
interface FileOpResultProps {
  operations: any[];
}

export function FileOpResults({ operations }: FileOpResultProps) {
  const completed = operations.filter(op => op.status === "completed");
  const errors = operations.filter(op => op.status === "error");
  const pending = operations.filter(op => op.status === "pending");

  if (operations.length === 0) return null;

  return (
    <div className="file-op-results">
      <div className="file-op-results-header">
        <h4>Resultados das Operações</h4>
        <div className="results-summary">
          {operations.filter(o => o.status === "completed").length > 0 && (
            <span className="summary-badge success">
              <CheckCircle size={12} /> {operations.filter(o => o.status === "completed").length} concluído(s)
            </span>
          )}
          {operations.filter(o => o.status === "error").length > 0 && (
            <span className="summary-badge error">
              <AlertCircle size={12} /> {operations.filter(o => o.status === "error").length} erro(s)
            </span>
          )}
          {operations.filter(o => o.status === "pending").length > 0 && (
            <span className="summary-badge pending">
              <Loader2 size={12} className="animate-spin" /> {operations.filter(o => o.status === "pending").length} pendente(s)
            </span>
          )}
        </div>
      </div>

      <div className="file-op-results-list">
        {operations.map((op) => (
          <div key={op.id} className={`file-op-result-item status-${op.status}`}>
            <div className="file-op-result-header">
              <span className={op.type === "read" ? "text-blue-400" : "text-green-400"}>
                {op.type === "read" ? "📖 Ler" : "✍️ Escrever"}
              </span>
              <code className="file-op-path">{op.path}</code>
              <span className={`status-badge ${op.status}`}>
                {op.status === "pending" && <Loader2 size={12} className="animate-spin" />}
                {op.status === "completed" && <CheckCircle size={12} />}
                {op.status === "error" && <AlertCircle size={12} />}
              </span>
            </div>
            
            {op.status === "completed" && op.result && (
              <div className="file-op-result-content">
                <pre>{op.result.slice(0, 1000)}{op.result.length > 1000 ? "..." : ""}</pre>
                <div className="result-actions">
                  <button onClick={() => navigator.clipboard.writeText(op.result || "")} className="result-btn">
                    <Copy size={12} /> Copiar
                  </button>
                </div>
              </div>
            )}
            
            {op.status === "error" && op.error && (
              <div className="file-op-error">
                <AlertCircle size={12} />
                <span>{op.error}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook para processar operações de arquivo no chat
export function useFileOperations() {
  const [operations, setOperations] = useState<FileOperation[]>([]);

  const executeOperation = useCallback(async (op: { type: "read" | "write"; path: string; content?: string }) => {
    const id = crypto.randomUUID();
    const newOp: FileOperation = {
      id,
      type: op.type,
      path: op.path,
      content: op.content,
      status: "pending",
    };
    
    setOperations(prev => [...prev, newOp]);
    
    try {
      // Aqui você chamaria o backend real via API ou MCP
      // Por enquanto simulamos
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
      
      let result = "";
      if (op.type === "read") {
        // Simular leitura
        result = `// Conteúdo simulado de ${op.path}\nconsole.log("Hello from ${op.path}");`;
      } else {
        // Simular escrita
        result = `Arquivo ${op.path} escrito com sucesso (${op.content?.length || 0} chars)`;
      }
      
      setOperations(prev => prev.map(o => 
        o.id === id ? { ...o, status: "completed", result } : o
      ));
    } catch (error) {
      setOperations(prev => prev.map(o => 
        o.id === id ? { ...o, status: "error", error: String(error) } : o
      ));
    }
  }, []);

  const removeOperation = useCallback((id: string) => {
    setOperations(prev => prev.filter(o => o.id !== id));
  }, []);

  const retryOperation = useCallback(async (id: string) => {
    const op = operations.find(o => o.id === id);
    if (op) {
      setOperations(prev => prev.map(o => o.id === id ? { ...o, status: "pending" } : o));
      // Retry logic
    }
  }, [operations]);

  const clearOperations = useCallback(() => {
    setOperations([]);
  }, []);

  return {
    operations,
    executeOperation,
    removeOperation,
    retryOperation,
    clearOperations,
  };
}

// Export types for external use
export type { FileOperation };