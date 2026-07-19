"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Copy, Download, Maximize2, Minimize2, FileText, Image, BarChart2, Table, Code,
  ChevronDown, ChevronUp, AlertCircle, Loader2
} from "lucide-react";

export interface Artifact {
  id: string;
  type: "markdown" | "code" | "chart" | "table" | "image" | "mermaid" | "json" | "html";
  title: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

interface ArtifactRendererProps {
  artifact: Artifact;
  className?: string;
  onExpand?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  expanded?: boolean;
}

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || rendered) return;
    
    const renderMermaid = async () => {
      try {
        const mermaid = await import("mermaid");
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });
        
        const id = `mermaid-${Date.now()}`;
        containerRef.current!.innerHTML = `<div class="mermaid" id="${id}">${code}</div>`;
        await mermaid.default.run({ nodes: [containerRef.current!.querySelector(`#${id}`)] });
        setRendered(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    };
    
    renderMermaid();
  }, [code, rendered]);

  if (error) {
    return (
      <div className="artifact-error">
        <AlertCircle size={16} />
        <span>Erro ao renderizar Mermaid: {error}</span>
        <pre className="artifact-code-fallback">{code}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-container" />;
}

function ChartRenderer({ config }: { config: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chart, setChart] = useState<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const initChart = async () => {
      const Chart = (await import("chart.js/auto")).default;
      
      if (chart) chart.destroy();
      
      const newChart = new Chart(canvasRef.current!, {
        type: config.type || "bar",
        data: config.data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "var(--text)" } },
          },
          scales: {
            x: { ticks: { color: "var(--text-secondary)" }, grid: { color: "var(--border)" } },
            y: { ticks: { color: "var(--text-secondary)" }, grid: { color: "var(--border)" } },
          },
        },
      });
      setChart(newChart);
    };
    
    initChart();
    return () => { if (chart) chart.destroy(); };
  }, [config]);

  return <canvas ref={canvasRef} className="artifact-chart" />;
}

function TableRenderer({ data }: { data: any[] }) {
  if (!data.length) return <div className="artifact-empty">Nenhum dado</div>;
  
  const columns = Object.keys(data[0]);
  
  return (
    <div className="artifact-table-wrapper">
      <table className="artifact-table">
        <thead>
          <tr>
            {columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => <td key={col}>{String(row[col])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeRenderer({ code, language = "typescript" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  
  return (
    <div className="artifact-code-block">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <button 
          className="code-copy-btn"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <pre><code className={`language-${language}`}>{code}</code></pre>
    </div>
  );
}

export function ArtifactRenderer({ 
  artifact, 
  className, 
  onExpand, 
  onDownload, 
  onCopy,
  expanded = false 
}: ArtifactRendererProps) {
  const [showRaw, setShowRaw] = useState(false);

  const renderContent = () => {
    switch (artifact.type) {
      case "markdown":
        return (
          <div className="artifact-markdown" dangerouslySetInnerHTML={{ 
            __html: require("marked").parse(artifact.content) 
          }} />
        );
      case "code":
        return <CodeRenderer code={artifact.content} language={artifact.metadata?.language || "typescript"} />;
      case "chart":
        try {
          const config = JSON.parse(artifact.content);
          return <ChartRenderer config={config} />;
        } catch {
          return <div className="artifact-error">Configuração de gráfico inválida</div>;
        }
      case "table":
        try {
          const data = JSON.parse(artifact.content);
          return <TableRenderer data={data} />;
        } catch {
          return <div className="artifact-error">Dados de tabela inválidos</div>;
        }
      case "image":
        return (
          <div className="artifact-image">
            <img src={artifact.content} alt={artifact.title} onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
        );
      case "mermaid":
        return <MermaidDiagram code={artifact.content} />;
      case "json":
        return <CodeRenderer code={JSON.stringify(JSON.parse(artifact.content), null, 2)} language="json" />;
      case "html":
        return <div className="artifact-html" dangerouslySetInnerHTML={{ __html: artifact.content }} />;
      default:
        return <pre className="artifact-plain">{artifact.content}</pre>;
    }
  };

  return (
    <div className={cn("artifact-renderer", className, expanded && "expanded")}>
      <div className="artifact-header">
        <div className="artifact-title-row">
          <div className="artifact-icon">
            {artifact.type === "markdown" && <FileText size={16} />}
            {artifact.type === "code" && <Code size={16} />}
            {artifact.type === "chart" && <BarChart2 size={16} />}
            {artifact.type === "table" && <Table size={16} />}
            {artifact.type === "image" && <Image size={16} />}
            {artifact.type === "mermaid" && <Code size={16} />}
            {artifact.type === "json" && <FileText size={16} />}
          </div>
          <h4 className="artifact-title">{artifact.title}</h4>
          <span className="artifact-type-badge">{artifact.type}</span>
        </div>
        <div className="artifact-actions">
          <button onClick={onExpand} className="btn-icon" title="Expandir">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={onCopy} className="btn-icon" title="Copiar">
            <Copy size={16} />
          </button>
          <button onClick={onDownload} className="btn-icon" title="Baixar">
            <Download size={16} />
          </button>
          <button onClick={() => setShowRaw(!showRaw)} className="btn-icon" title="Ver raw">
            <Code size={16} />
          </button>
        </div>
      </div>
      
      <div className={cn("artifact-content", showRaw && "raw")}>
        {showRaw ? (
          <pre className="artifact-raw-content">{artifact.content}</pre>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}

export default ArtifactRenderer;