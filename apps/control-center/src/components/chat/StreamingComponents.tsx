"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, Loader2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

// Lazy-load shiki highlighter
let highlighterPromise: Promise<any> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import("shiki");
      return createHighlighter({
        themes: ["github-dark", "github-light"],
        langs: [
          "typescript", "javascript", "python", "rust", "go", "java", "cpp", "c",
          "csharp", "php", "ruby", "swift", "kotlin", "scala", "html", "css",
          "json", "yaml", "toml", "sql", "bash", "dockerfile", "markdown", "text"
        ],
      });
    })();
  }
  return highlighterPromise;
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

export function CodeBlock({ language = "text", code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const codeRef = useRef<string>(code);
  const langRef = useRef<string>(language);

  codeRef.current = code;
  langRef.current = language;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    getHighlighter()
      .then((highlighter) => {
        if (!mounted) return;
        try {
          const html = highlighter.codeToHtml(codeRef.current, {
            lang: langRef.current || "text",
            theme: "github-dark",
          });
          setHighlighted(html);
        } catch (e) {
          console.warn("Shiki highlighting failed:", e);
          setHighlighted(`<pre><code>${escapeHtml(codeRef.current)}</code></pre>`);
        } finally {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setHighlighted(`<pre><code>${escapeHtml(codeRef.current)}</code></pre>`);
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="code-block">
        <div className="code-block-header">
          <span className="code-language">{language}</span>
          <button className="copy-code-btn" onClick={handleCopy} title="Copiar" disabled>
            <Loader2 size={14} className="spin" />
          </button>
        </div>
        <pre><code>{code}</code></pre>
      </div>
    );
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button className="copy-code-btn" onClick={handleCopy} title="Copiar">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>
      <div 
        className="code-block-content" 
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "&#039;");
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
      title="Copiar conteudo"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}