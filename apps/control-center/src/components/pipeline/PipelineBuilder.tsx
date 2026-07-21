"use client";

import React from "react";
import { cn } from "@/lib/utils";
import "./PipelineBuilder.css";

export type NodeType =
  | "agent"
  | "tool"
  | "condition"
  | "loop"
  | "input"
  | "output"
  | "parallel"
  | "delay"
  | "code"
  | "http"
  | "db";

export interface PipelineNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  disabled?: boolean;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  style?: React.CSSProperties;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  createdAt: string;
  updatedAt: string;
}

export const NODE_TYPES: Record<string, {
  label: string;
  icon: string;
  color: string;
  description: string;
  defaultConfig: Record<string, any>;
  inputs: number;
  outputs: number;
}> = {
  agent: { label: "Agente LLM", icon: "🤖", color: "#8B5CF6", description: "Agente de IA com modelo LLM", defaultConfig: { model: "gpt-4", temperature: 0.7, systemPrompt: "" }, inputs: 1, outputs: 1 },
  tool: { label: "Ferramenta", icon: "🔧", color: "#10B981", description: "Chamada de função/ferramenta", defaultConfig: { toolName: "", parameters: {} }, inputs: 1, outputs: 1 },
  condition: { label: "Condição", icon: "❓", color: "#F59E0B", description: "Branching if/else", defaultConfig: { condition: "", trueLabel: "Sim", falseLabel: "Não" }, inputs: 1, outputs: 2 },
  loop: { label: "Loop", icon: "🔄", color: "#3B82F6", description: "Repetição while/for", defaultConfig: { type: "while", condition: "", maxIterations: 10 }, inputs: 1, outputs: 1 },
  input: { label: "Entrada", icon: "📥", color: "#6366F1", description: "Entrada inicial do workflow", defaultConfig: { schema: {} }, inputs: 0, outputs: 1 },
  output: { label: "Saída", icon: "📤", color: "#EC4899", description: "Resultado final", defaultConfig: { format: "text" }, inputs: 1, outputs: 0 },
  parallel: { label: "Paralelo", icon: "⚡", color: "#14B8A6", description: "Execução paralela", defaultConfig: { branches: 2 }, inputs: 1, outputs: 2 },
  delay: { label: "Atraso", icon: "⏱️", color: "#64748B", description: "Espera/pausa", defaultConfig: { ms: 1000 }, inputs: 1, outputs: 1 },
  code: { label: "Código", icon: "💻", color: "#7C3AED", description: "Código customizado", defaultConfig: { language: "javascript", code: "" }, inputs: 1, outputs: 1 },
  http: { label: "HTTP", icon: "🌐", color: "#06B6D4", description: "Requisição HTTP", defaultConfig: { method: "GET", url: "", headers: {}, body: "" }, inputs: 1, outputs: 1 },
  db: { label: "Banco de Dados", icon: "🗄️", color: "#84CC16", description: "Query no banco", defaultConfig: { query: "", params: [] }, inputs: 1, outputs: 1 },
};

export interface PipelineBuilderProps {
  pipeline?: Pipeline;
  project?: any;
  onSave?: (pipeline: Pipeline) => void;
  onRun?: (pipeline: Pipeline) => void;
  readOnly?: boolean;
  className?: string;
}

export function PipelineBuilder({ pipeline, project, onSave, onRun, readOnly = false, className }: PipelineBuilderProps) {
  const p = pipeline || {
    id: crypto.randomUUID(),
    name: "Novo Workflow",
    description: "",
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className={cn("pipeline-builder", className)}>
      <div className="pipeline-header">
        <h3>{p.name}</h3>
        <div className="pipeline-actions">
          {onRun && (
            <button className="btn-primary" onClick={() => onRun(p)}>
              ▶ Executar
            </button>
          )}
          {onSave && (
            <button className="btn-secondary" onClick={() => onSave(p)}>
              💾 Salvar
            </button>
          )}
        </div>
      </div>
      <div className="pipeline-canvas">
        {p.nodes.length === 0 ? (
          <div className="pipeline-empty">
            <p>Nenhum nó no pipeline.</p>
            <p className="text-muted">Arraste tipos de nó do painel lateral para começar.</p>
          </div>
        ) : (
          <div className="pipeline-nodes">
            {p.nodes.map((node) => {
              const type = NODE_TYPES[node.type];
              return (
                <div
                  key={node.id}
                  className="pipeline-node"
                  style={{ borderLeftColor: type?.color || "#6B7280" }}
                >
                  <span className="node-icon">{type?.icon || "?"}</span>
                  <span className="node-label">{node.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PipelineBuilder;
