"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, Loader2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function CodeBlock({ language = "text", code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button className="copy-code-btn" onClick={handleCopy} title="Copiar">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>
      <pre><code className={`language-${language}`}>{code}</code></pre>
    </div>
  );
}

export function RegenerateButton({ 
  onClick, 
  disabled = false, 
  loading = false 
}: { 
  onClick: () => void; 
  disabled?: boolean; 
  loading?: boolean; 
}) {
  return (
    <button
      className={cn(
        "regenerate-btn",
        disabled && "disabled",
        loading && "loading"
      )}
      onClick={onClick}
      disabled={disabled || loading}
      title="Regenerar resposta"
    >
      {loading ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
    </button>
  );
}

export function CopyButton({ 
  content, 
  onCopy 
}: { 
  content: string; 
  onCopy?: (content: string) => void; 
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy?.(content);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      className={cn("copy-btn", copied && "copied")}
      onClick={handleCopy}
      title="Copiar conteúdo"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// Need to import Bot icon
import { Bot } from "lucide-react";