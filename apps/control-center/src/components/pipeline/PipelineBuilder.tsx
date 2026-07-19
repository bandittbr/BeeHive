"use client";

import React, { 
  useState, 
  useCallback, 
  useRef, 
  useEffect, 
  useMemo,
  DragEvent,
  MouseEvent,
  KeyboardEvent
} from "react";
import { 
  Plus, Trash2, GripVertical, Settings, X, ChevronDown, ChevronRight, MoreHorizontal,
  Save, Play, ZoomIn, ZoomOut, Home, Grid, Minimize2, Maximize2, 
  Bot, Zap, Loader2, GitBranch, Terminal, Code2, Globe, Database,
  RotateCcw, Copy, CopyCheck, Minimize2, Maximize2,
  Search, Filter, ChevronDown, ChevronUp,
  Clock, ToggleLeft, ToggleRight, RefreshCw, Eye, Edit2, Trash2,
  Calendar, Zap as ZapIcon, CheckCircle, AlertCircle, Loader2 as LoaderIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

import "./PipelineBuilder.css";

// ============================================
// TYPES
// ============================================

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

// Node type configurations
export const NODE_TYPES: Record<string, { 
  label: string; 
  icon: string; 
  color: string;
  description: string;
  defaultConfig: Record<string, any>;
  inputs: number;
  outputs: number;
}> = {
  agent: {
    label: "Agente LLM",
    icon: "🤖",
    color: "#8B5CF6",
    description: "Agente de IA com modelo LLM",
    defaultConfig: { model: "gpt-4", temperature: 0.7, systemPrompt: "" },
    inputs: 1,
    outputs: 1,
  },
  tool: {
    label: "Ferramenta",
    icon: "🔧",
    color: "#10B981",
    description: "Chamada de função/ferramenta",
    defaultConfig: { toolName: "", parameters: {} },
    inputs: 1,
    outputs: 1,
  },
  condition: {
    label: "Condição",
    icon: "❓",
    color: "#F59E0B",
    description: "Branching if/else",
    defaultConfig: { condition: "", trueLabel: "Sim", falseLabel: "Não" },
    inputs: 1,
    outputs: 2,
  },
  loop: {
    label: "Loop",
    icon: "🔄",
    color: "#3B82F6",
    description: "Repetição while/for",
    defaultConfig: { type: "while", condition: "", maxIterations: 10 },
    inputs: 1,
    outputs: 1,
  },
  input: {
    label: "Entrada",
    icon: "📥",
    color: "#6366F1",
    description: "Entrada inicial do workflow",
    defaultConfig: { schema: {} },
    inputs: 0,
    outputs: 1,
  },
  output: {
    label: "Saída",
    icon: "📤",
    color: "#EC4899",
    description: "Resultado final",
    defaultConfig: { format: "text" },
    inputs: 1,
    outputs: 0,
  },
  parallel: {
    label: "Paralelo",
    icon: "⚡",
    color: "#14B8A6",
    description: "Execução paralela",
    defaultConfig: { branches: 2 },
    inputs: 1,
    outputs: 2,
  },
  delay: {
    label: "Atraso",
    icon: "⏱️",
    color: "#64748B",
    description: "Espera/pausa",
    defaultConfig: { ms: 1000 },
    inputs: 1,
    outputs: 1,
  },
  code: {
    label: "Código",
    icon: "💻",
    color: "#7C3AED",
    description: "Código customizado",
    defaultConfig: { language: "javascript", code: "" },
    inputs: 1,
    outputs: 1,
  },
  http: {
    label: "HTTP",
    icon: "🌐",
    color: "#06B6D4",
    description: "Requisição HTTP",
    defaultConfig: { method: "GET", url: "", headers: {}, body: "" },
    inputs: 1,
    outputs: 1,
  },
  db: {
    label: "Banco de Dados",
    icon: "🗄️",
    color: "#84CC16",
    description: "Query no banco",
    defaultConfig: { query: "", params: [] },
    inputs: 1,
    outputs: 1,
  },
};

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

export interface PipelineBuilderProps {
  pipeline?: Pipeline;
  onSave?: (pipeline: Pipeline) => void;
  onRun?: (pipeline: Pipeline) => void;
  readOnly?: boolean;
  className?: string;
}

const NODE_TYPES = {
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

const NODE_WIDTH = 180;
const NODE_HEADER_HEIGHT = 36;
const NODE_HANDLE_SIZE = 12;

interface PipelineBuilderProps {
  pipeline?: any;
  project?: any;
  onSave?: (pipeline: any) => void;
  onRun?: (pipeline: any) => void;
  readOnly?: boolean;
  className?: string;
}

export function PipelineBuilder({ pipeline: initialPipeline, project, onSave, onRun, readOnly = false, className }: any) {
  const [pipeline, setPipeline] = useState<any>(initialPipeline || {
    id: crypto.randomUUID(),
    name: "Novo Workflow",
    description: "",
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ sourceId: string; startX: number; startY: number } | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [execution, setExecution] = useState<any>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback((newPipeline: any) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newPipeline]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const updatePipeline = useCallback((updater: (prev: any) => any) => {
    setPipeline(prev => {
      const newPipeline = updater({ ...prev });
      newPipeline.updatedAt = new Date().toISOString();
      // saveToHistory(newPipeline); // Avoid circular updates during drag
      return newPipeline;
    });
  }, []);

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const nodeType = NODE_TYPES[type];
    const newNode = {
      id: crypto.randomUUID(),
      type,
      label: NODE_TYPES[type].label,
      position,
      config: { ...NODE_TYPES[type].defaultConfig },
      inputs: [],
      outputs: [],
    };
    setPipeline(prev => {
      const next = { ...pipeline, nodes: [...pipeline.nodes, newNode] };
      next.updatedAt = new Date().toISOString();
      return next;
    });
  }, []);

  const updateNode = useCallback((id: string, updates: any) => {
    setPipeline(prev => ({
      ...pipeline,
      nodes: pipeline.nodes.map(n => n.id === id ? { ...n, ...updates } : n),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setPipeline(prev => ({
      ...pipeline,
      nodes: pipeline.nodes.filter(n => n.id !== id),
      edges: pipeline.edges.filter(e => e.source !== id && e.target !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const duplicateNode = useCallback((id: string) => {
    const node = pipeline.nodes.find(n => n.id === id);
    if (!node) return;
    
    const newNode = {
      ...node,
      id: crypto.randomUUID(),
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      label: node.label + " (cópia)",
    });
    setPipeline(prev => ({
      ...pipeline,
      nodes: [...pipeline.nodes, newNode],
      updatedAt: new Date().toISOString(),
    }));
  }, [pipeline]);

  const addEdge = useCallback((edge: any) => {
    setPipeline(prev => ({
      ...prev,
      edges: [...prev.edges, edge],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setPipeline(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleConnect = useCallback((params: any) => {
    const edge = {
      id: crypto.randomUUID(),
      ...params,
    };
    setPipeline(prev => ({
      ...pipeline,
      edges: [...pipeline.edges, edge],
      updatedAt: new Date().toISOString(),
    }));
  }, [pipeline]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setViewport(prev => {
        const zoom = Math.min(Math.max(prev.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.1), 3);
        return { ...prev, zoom };
      });
    }
  }, []);

  const handlePan = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      const handleMove = (moveEvent: MouseEvent) => {
        setViewport(prev => ({
          ...prev,
          x: prev.x + moveEvent.movementX,
          y: prev.y + moveEvent.movementY,
        }));
      };
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    }
  }, []);

  const snapToGrid = useCallback((pos: { x: number; y: number }) => {
    if (!snapToGrid) return pos;
    const gridSize = 20;
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
  }, [snapToGrid]);

  // Execution handlers
  const handleRun = useCallback(async () => {
    setIsExecuting(true);
    setExecution({
      id: `exec-${Date.now()}`,
      pipelineId: pipeline.id,
      projectId: project?.id,
      status: "running",
      startedAt: new Date().toISOString(),
    });
    setExecutionLogs([`[${new Date().toLocaleTimeString()}] 🚀 Starting pipeline execution...`]);
    setNodeStatuses({});

    // Simulate execution - in production, call the API
    const nodeTypes = [...new Set(pipeline.nodes.map(n => n.type))];
    const typeOrder = ["input", "agent", "tool", "condition", "loop", "parallel", "delay", "code", "http", "db", "output"];
    const sortedTypes = nodeTypes.sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

    for (const type of sortedTypes) {
      if (!isExecuting) break;
      const nodesOfType = pipeline.nodes.filter(n => n.type === type);
      for (const node of nodesOfType) {
        setNodeStatuses(prev => ({ ...prev, [node.id]: "running" }));
        setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔄 ${node.label} (${type}) running...`]);
        
        // Simulate work
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
        
        if (!isExecuting) break;
        
        const success = Math.random() > 0.1; // 90% success
        setNodeStatuses(prev => ({ ...prev, [node.id]: success ? "success" : "error" }));
        setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${success ? "✅" : "❌"} ${node.label} ${success ? "completed" : "failed"}`]);
        
        if (!success && !isExecuting) break;
      }
    }

    const finalStatus = Object.values(nodeStatuses).includes("error") ? "error" : "success";
    setExecution(prev => prev ? { ...prev, status: finalStatus, completedAt: new Date().toISOString() } : null);
    setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${finalStatus === "success" ? "🎉" : "💥"} Pipeline ${finalStatus === "success" ? "completed successfully" : "failed"}`]);
    setIsExecuting(false);
  }, [pipeline, project, isExecuting, nodeStatuses]);

  const handleStop = useCallback(() => {
    setIsExecuting(false);
    setExecution(prev => prev ? { ...prev, status: "error", completedAt: new Date().toISOString() } : null);
    setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏹️ Execution stopped by user`]);
  }, []);

  return (
    <div className={cn("pipeline-builder", className)} ref={containerRef} onWheel={handleWheel} onMouseDown={handlePan}>
      {/* Toolbar */}
      <div className="pipeline-toolbar">
        <div className="toolbar-left">
          <h2 className="pipeline-title">Pipeline Builder</h2>
          <span className="pipeline-status">{pipeline.nodes.length} nós, {pipeline.edges.length} conexões</span>
        </div>
        <div className="toolbar-center">
          <div className="zoom-controls">
            <button onClick={() => setViewport(p => ({ ...p, zoom: Math.max(0.1, p.zoom - 0.1) }))} title="Zoom out">−</button>
            <span>{Math.round(viewport.zoom * 100)}%</span>
            <button onClick={() => setViewport(p => ({ ...p, zoom: Math.min(3, p.zoom + 0.1) }))} title="Zoom in">+</button>
            <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} title="Reset zoom">⌂</button>
          </div>
          <div className="view-options">
            <label><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Grid</label>
            <label><input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} /> Snap</label>
          </div>
        </div>
        <div className="toolbar-right">
          <button onClick={() => onSave?.(pipeline)} disabled={false} className="btn-primary">
            <Save size={16} /> Salvar
          </button>
          <button onClick={onRun} className="btn-success">
            <Play size={16} /> Executar
          </button>
          <button onClick={() => setShowScheduler(!showScheduler)} className="btn-secondary">
            <Calendar size={16} /> Agendador
          </button>
        </div>
      </div>

      {/* Node Palette */}
      <div className="node-palette">
        <div className="palette-header">
          <span>Componentes</span>
          <input type="text" placeholder="Buscar componentes..." className="palette-search" />
        </div>
        <div className="palette-items">
          {Object.entries(NODE_TYPES).map(([type, config]) => (
            <div
              key={type}
              className="palette-item"
              draggable={!readOnly}
              onDragStart={e => {
                e.dataTransfer.setData("node-type", type);
                e.dataTransfer.effectAllowed = "copy";
              }}
            >
              <span className="palette-icon" style={{ backgroundColor: config.color }}>{config.icon}</span>
              <div className="palette-info">
                <span className="palette-label">{config.label}</span>
                <span className="palette-desc">{config.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="pipeline-canvas-wrapper" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <div className="pipeline-canvas" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
          {/* Grid background */}
          {showGrid && (
            <div className="grid-background" style={{ backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px` }} />
          )}
          
          {/* Edges */}
          <svg ref={svgRef} className="edges-layer">
            {pipeline.edges.map(edge => {
              const sourceNode = pipeline.nodes.find(n => n.id === edge.source);
              const targetNode = pipeline.nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              const sourcePos = {
                x: sourceNode.position.x + NODE_WIDTH,
                y: sourceNode.position.y + NODE_HEADER_HEIGHT / 2,
              };
              const targetPos = {
                x: targetNode.position.x,
                y: targetNode.position.y + NODE_HEADER_HEIGHT / 2,
              };
              
              const path = `M ${sourcePos.x} ${sourcePos.y} 
                C ${sourcePos.x + 100} ${sourcePos.y} 
                  ${targetPos.x - 100} ${targetPos.y} 
                  ${targetPos.x} ${targetPos.y}`;
              
              return (
                <path
                  key={edge.id}
                  d={path}
                  stroke={selectedEdge === edge.id ? "#8B5CF6" : "#4B5563"}
                  strokeWidth={selectedEdge === edge.id ? 3 : 2}
                  fill="none"
                  strokeDasharray={selectedEdge === edge.id ? "5,5" : "none"}
                  markerEnd="url(#arrowhead)"
                  onClick={e => { e.stopPropagation(); setSelectedEdge(edge.id); }}
                />
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#4B5563" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {pipeline.nodes.map(node => (
            <PipelineNode
              key={node.id}
              node={node}
              selected={selectedNode === node.id}
              onSelect={setSelectedNode}
              onDragStart={handleNodeDragStart}
              onDragEnd={handleNodeDragEnd}
              onConnect={handleConnect}
              readOnly={readOnly}
              position={node.position}
              onPositionChange={pos => updateNode(node.id, { position: pos })}
              config={node.config}
              onConfigChange={config => updateNode(node.id, { config })}
            ))}
          {/* Connection preview */}
          {connecting && (
            <svg className="connection-preview">
              <path
                d={`M ${connecting.startX} ${connecting.startY} C ${connecting.startX + 100} ${connecting.startY} ${connecting.currentX - 100} ${connecting.currentY} ${connecting.currentX} ${connecting.currentY}`}
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="none"
                strokeDasharray="5,5"
              />
              <defs>
                <marker id="preview-arrowhead" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" />
                </marker>
              </defs>
            </svg>
          )}
        </div>

        {/* Mini-map */}
        <div className="minimap">
          <div className="minimap-content" style={{ transform: `scale(${0.1 * viewport.zoom}) translate(${viewport.x * 0.1}px, ${viewport.y * 0.1}px)` }}>
            {pipeline.nodes.map(node => (
              <div key={node.id} className={`minimap-node ${selectedNode === node.id ? "selected" : ""}`} style={{
                left: node.position.x * 0.1,
                top: node.position.y * 0.1,
                backgroundColor: NODE_TYPES[node.type]?.color || "#6B7280",
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <aside className="properties-panel">
        <div className="panel-header">
          <h3>Propriedades</h3>
        </div>
        <div className="panel-content">
          {selectedNode ? (
            <div>
              <h4>{pipeline.nodes.find(n => n.id === selectedNode)?.label}</h4>
              <div className="config-field">
                <label>ID</label>
                <input type="text" value={selectedNode} readOnly className="config-field-input" />
              </div>
              <div className="config-field">
                <label>Tipo</label>
                <input type="text" value={NODE_TYPES[pipeline.nodes.find(n => n.id === selectedNode)?.type || ""]?.label || "Desconhecido"} readOnly className="config-field-input" />
              </div>
              <div className="config-field">
                <label>Label</label>
                <input 
                  type="text" 
                  value={pipeline.nodes.find(n => n.id === selectedNode)?.label || ""} 
                  onChange={e => updateNode(selectedNode, { label: e.target.value })}
                  className="config-field-input"
                />
              </div>
              <div className="config-field">
                <label>Posição</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input 
                    type="number" 
                    value={Math.round(pipeline.nodes.find(n => n.id === selectedNode)?.position.x || 0)} 
                    onChange={e => updateNode(selectedNode, { position: { x: parseInt(e.target.value), y: pipeline.nodes.find(n => n.id === selectedNode)?.position.y || 0 } })}
                    className="config-field-input"
                    style={{ width: "60px" }}
                  />
                  <input 
                    type="number" 
                    value={Math.round(pipeline.nodes.find(n => n.id === selectedNode)?.position.y || 0)} 
                    onChange={e => updateNode(selectedNode, { position: { x: pipeline.nodes.find(n => n.id === selectedNode)?.position.x || 0, y: parseInt(e.target.value) } })}
                    className="config-field-input"
                    style={{ width: "60px" }}
                  />
                </div>
              </div>
              <hr style={{ margin: "16px 0", borderColor: "var(--border)" }} />
              <h5 style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>Configuração</h5>
              {pipeline.nodes.find(n => n.id === selectedNode) && Object.entries(pipeline.nodes.find(n => n.id === selectedNode)!.config).map(([key, value]) => (
                <div key={key} className="config-field">
                  <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                  {typeof value === "boolean" ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={value} 
                        onChange={e => updateNode(selectedNode, { config: { ...pipeline.nodes.find(n => n.id === selectedNode)!.config, [key]: e.target.checked } })}
                      />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{value ? "Sim" : "Não"}</span>
                    </label>
                  ) : typeof value === "number" ? (
                    <input 
                      type="number" 
                      value={value} 
                      onChange={e => updateNode(selectedNode, { config: { ...pipeline.nodes.find(n => n.id === selectedNode)!.config, [key]: parseFloat(e.target.value) } })}
                      className="config-field-input"
                    />
                  ) : (
                    <textarea 
                      value={value} 
                      onChange={e => updateNode(selectedNode, { config: { ...pipeline.nodes.find(n => n.id === selectedNode)!.config, [key]: e.target.value } })}
                      className="config-field-input"
                      style={{ minHeight: "60px", fontFamily: "var(--font-mono)", fontSize: 12 }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              <Bot size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p>Selecione um nó para editar suas propriedades</p>
            </div>
)}
        <div className="pipeline-builder">
      {showScheduler && (
        <SchedulerPanel 
          pipeline={pipeline} 
          project={project}
          onClose={() => setShowScheduler(false)}
        />
      )}
      </aside>
    </div>
  );
}

// ============================================
// SCHEDULER PANEL COMPONENT
// ============================================

interface SchedulerPanelProps {
  pipeline: any;
  project: any;
  onClose: () => void;
}

function SchedulerPanel({ pipeline, project, onClose }: SchedulerPanelProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cronExpression: "0 2 * * *",
    timezone: "America/Sao_Paulo",
    webhookSecret: "",
  });
  const [cronError, setCronError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!pipeline?.id || !project?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduler/jobs?projectId=${project.id}&pipelineId=${pipeline.id}`);
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [pipeline?.id, project?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const validateCron = (expression: string) => {
    try {
      const parts = expression.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        setCronError("Expressão cron inválida (use 5 ou 6 campos)");
        return false;
      }
      setCronError(null);
      return true;
    } catch {
      setCronError("Expressão cron inválida");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCron(formData.cronExpression)) return;
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const url = editingJob ? `/api/scheduler/jobs/${editingJob.id}` : "/api/scheduler/jobs";
      const method = editingJob ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineId: pipeline.id,
          projectId: project.id,
          ...formData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save job");
      }

      setShowForm(false);
      setEditingJob(null);
      setFormData({ name: "", cronExpression: "0 2 * * *", timezone: "America/Sao_Paulo", webhookSecret: "" });
      fetchJobs();
    } catch (error) {
      console.error("Failed to save job:", error);
      alert(error instanceof Error ? error.message : "Failed to save job");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    try {
      await fetch(`/api/scheduler/jobs/${jobId}`, { method: "DELETE" });
      fetchJobs();
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const handleToggle = async (job: any) => {
    try {
      await fetch(`/api/scheduler/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !job.enabled }),
      });
      fetchJobs();
    } catch (error) {
      console.error("Failed to toggle job:", error);
    }
  };

  const handleEdit = (job: any) => {
    setEditingJob(job);
    setFormData({
      name: job.name,
      cronExpression: job.cronExpression,
      timezone: job.timezone,
      webhookSecret: job.webhookSecret || "",
    });
    setShowForm(true);
  };

  const handleRunNow = async (job: any) => {
    try {
      await fetch(`/api/scheduler/trigger-manual/${job.pipelineId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredBy: "manual" }),
      });
      fetchJobs();
    } catch (error) {
      console.error("Failed to run job:", error);
    }
  };

  const cronExamples = [
    { label: "A cada minuto", value: "* * * * *" },
    { label: "A cada hora", value: "0 * * * *" },
    { label: "Diariamente à meia-noite", value: "0 0 * * *" },
    { label: "Diariamente às 2h", value: "0 2 * * *" },
    { label: "Segunda a sexta às 9h", value: "0 9 * * 1-5" },
    { label: "Todo domingo às 3h", value: "0 3 * * 0" },
    { label: "Primeiro dia do mês", value: "0 0 1 * *" },
  ];

  const getStatusBadge = (job: any) => {
    if (!job.enabled) return <span className="status-badge disabled">Desativado</span>;
    if (job.lastRunStatus === "running") return <span className="status-badge running"><LoaderIcon size={12} className="spin" /> Executando</span>;
    if (job.lastRunStatus === "success") return <span className="status-badge success"><CheckCircle size={12} /> Sucesso</span>;
    if (job.lastRunStatus === "error") return <span className="status-badge error"><AlertCircle size={12} /> Erro</span>;
    return <span className="status-badge pending">Pendente</span>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Nunca";
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="scheduler-panel">
      <div className="scheduler-header">
        <h3>Agendador de Pipelines</h3>
        <button className="btn-icon" onClick={onClose} title="Fechar">
          <X size={16} />
        </button>
      </div>

      <div className="scheduler-content">
        {showForm ? (
          <div className="scheduler-form-container">
            <form onSubmit={handleSubmit} className="scheduler-form">
              <h4>{editingJob ? "Editar Agendamento" : "Novo Agendamento"}</h4>
              
              <div className="form-group">
                <label>Nome do Agendamento</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Build diário, Deploy noturno"
                  required
                />
              </div>

              <div className="form-group">
                <label>Expressão Cron</label>
                <div className="cron-input-wrapper">
                  <input
                    type="text"
                    value={formData.cronExpression}
                    onChange={(e) => {
                      setFormData({ ...formData, cronExpression: e.target.value });
                      validateCron(e.target.value);
                    }}
                    placeholder="0 2 * * *"
                    required
                    className={cronError ? "error" : ""}
                  />
                  <span className="cron-hint">min hora dia mês dia_semana</span>
                </div>
                {cronError && <span className="error-message">{cronError}</span>}
                
                <div className="cron-examples">
                  {cronExamples.map((ex) => (
                    <button
                      key={ex.value}
                      type="button"
                      className="cron-example"
                      onClick={() => {
                        setFormData({ ...formData, cronExpression: ex.value });
                        validateCron(ex.value);
                      }}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Webhook Secret (opcional)</label>
                <input
                  type="text"
                  value={formData.webhookSecret}
                  onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                  placeholder="Secret para validação de webhook externo"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingJob(null); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <LoaderIcon size={16} className="spin" /> : (editingJob ? "Atualizar" : "Criar")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="scheduler-toolbar">
              <h4>Agendamentos Configurados</h4>
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Novo Agendamento
              </button>
            </div>

            {loading ? (
              <div className="scheduler-loading">
                <LoaderIcon size={24} className="spin" />
                <span>Carregando agendamentos...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="scheduler-empty-state">
                <Calendar size={48} />
                <p>Nenhum agendamento configurado</p>
                <span>Crie seu primeiro agendamento para executar esta pipeline automaticamente</span>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                  <Plus size={16} /> Criar Primeiro Agendamento
                </button>
              </div>
            ) : (
              <div className="scheduler-jobs-list">
                {jobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-header">
                      <div className="job-info">
                        <h5>{job.name}</h5>
                        <div className="job-meta">
                          <span className="cron-expression">{job.cronExpression}</span>
                          <span className="timezone">{job.timezone}</span>
                        </div>
                      </div>
                      {getStatusBadge(job)}
                    </div>

                    <div className="job-stats">
                      <div className="stat">
                        <span className="stat-label">Execuções</span>
                        <span className="stat-value">{job.runCount || 0}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Última execução</span>
                        <span className="stat-value">{formatDate(job.lastRunAt)}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Próxima execução</span>
                        <span className="stat-value">{formatDate(job.nextRunAt)}</span>
                      </div>
                    </div>

                    <div className="job-actions">
                      <button 
                        className="btn-icon" 
                        onClick={() => handleRunNow(job)}
                        title="Executar agora"
                        disabled={job.lastRunStatus === "running"}
                      >
                        <Play size={16} />
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleToggle(job)}
                        title={job.enabled ? "Desativar" : "Ativar"}
                      >
                        {job.enabled ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleEdit(job)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn-icon danger" 
                        onClick={() => handleDelete(job.id)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {job.executions && job.executions.length > 0 && (
                      <div className="job-executions">
                        <h6>Últimas execuções:</h6>
                        <div className="executions-list">
                          {job.executions.slice(0, 5).map((exec: any) => (
                            <div key={exec.id} className={`execution-item ${exec.status}`}>
                              <span className="exec-status">
                                {exec.status === "success" && <CheckCircle size={12} />}
                                {exec.status === "error" && <AlertCircle size={12} />}
                                {exec.status === "running" && <LoaderIcon size={12} className="spin" />}
                              </span>
                              <span className="exec-time">{formatDate(exec.startedAt)}</span>
                              <span className="exec-trigger">{exec.triggeredBy}</span>
                              {exec.error && <span className="exec-error" title={exec.error}>Erro: {exec.error.substring(0, 50)}...</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SchedulerPanel;

// ============================================
// EXECUTION PANEL COMPONENT
// ============================================

interface ExecutionPanelProps {
  pipeline: any;
  project: any;
  isRunning: boolean;
  onRun: () => void;
  onStop: () => void;
}

function ExecutionPanel({ pipeline, project, isRunning, onRun, onStop }: ExecutionPanelProps) {
  const [execution, setExecution] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, "idle" | "running" | "success" | "error">>({});
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const executionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isRunning) {
      // Cleanup on stop
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      return;
    }

    // Start execution via API
    const startExecution = async () => {
      try {
        const res = await fetch(`/api/executions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            pipelineId: pipeline.id, 
            projectId: project.id,
            triggeredBy: 'manual'
          }),
        });
        const data = await res.json();
        if (data.executionId) {
          executionIdRef.current = data.executionId;
          connectSSE(data.executionId);
        }
      } catch (error) {
        console.error('Failed to start execution:', error);
      }
    };

    const connectSSE = (executionId: string) => {
      const es = new EventSource(`/api/executions/${executionId}/stream`);
      setEventSource(es);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleSSEEvent(data);
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      es.onerror = () => {
        es.close();
      };
    };

    const handleSSEEvent = (event: any) => {
      if (event.type === 'init') {
        setExecution(event.execution);
        // Initialize node statuses
        const statuses: Record<string, "idle" | "running" | "success" | "error"> = {};
        event.execution.nodes.forEach((n: any) => {
          statuses[n.id] = n.status === "pending" ? "idle" : n.status;
        });
        setNodeStatuses(statuses);
      } else if (event.type === 'node') {
        const status = event.data.status;
        setNodeStatuses(prev => ({ ...prev, [event.data.nodeId]: status }));
        if (status === 'running') {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ▶️ ${event.data.nodeName} (${event.data.nodeType}) running...`]);
        } else if (status === 'success') {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${event.data.nodeName} completed`]);
        } else if (status === 'error') {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ ${event.data.nodeName} failed: ${event.data.error || 'Unknown error'}`]);
        }
      } else if (event.type === 'log') {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${event.data.log}`]);
      } else if (event.type === 'complete') {
        setExecution(prev => prev ? { ...prev, status: event.data.status, completedAt: event.data.completedAt } : null);
        onStop();
      }
    };

    startExecution();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isRunning, pipeline.id, project.id, onStop]);

  const scrollToBottom = () => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const getNodeStatus = (nodeId: string) => {
    const node = pipeline.nodes.find((n: any) => n.id === nodeId);
    if (!node) return "idle";
    const type = node.type;
    // Map node types to execution steps
    const typeMap: Record<string, string> = {
      input: "input",
      agent: "agent",
      tool: "tool",
      condition: "condition",
      loop: "agent",
      parallel: "agent",
      delay: "tool",
      code: "tool",
      http: "tool",
      db: "tool",
      output: "output",
    };
    return nodeStatuses[typeMap[type] || type] || "idle";
  };

  return (
    <div className="execution-panel">
      <div className="execution-header">
        <h3>Execução</h3>
        <div className="execution-status">
          <span className={cn("status-indicator", isRunning ? "running" : "idle")} />
          <span>{isRunning ? "Executando" : "Parado"}</span>
        </div>
      </div>

      <div className="execution-toolbar">
        <button 
          className="btn-primary" 
          onClick={isRunning ? onStop : onRun}
          disabled={isRunning && !onStop}
        >
          {isRunning ? (
            <>
              <Loader2 size={16} className="spin" />
              Parar
            </>
          ) : (
            <>
              <Play size={16} />
              Executar
            </>
          )}
        </button>
        {execution && (
          <button className="btn-secondary" onClick={() => {}}>
            <Copy size={16} /> Copiar Logs
          </button>
        )}
      </div>

      <div className="execution-tabs">
        <button className="tab active">Nodes</button>
        <button className="tab">Logs</button>
        <button className="tab">Timeline</button>
      </div>

      <div className="execution-content">
        {/* Nodes View */}
        <div className="execution-nodes">
          {pipeline.nodes.map((node: any) => {
            const status = getNodeStatus(node.id);
            return (
              <div key={node.id} className={cn("execution-node-item", status)}>
                <div className="node-status-indicator">
                  <span className={cn("status-dot", status)} />
                  <span className="node-type-badge">{NODE_TYPES[node.type]?.icon || "⬜"}</span>
                  <span className="node-label">{node.label}</span>
                </div>
                <div className="node-status-badge">{status}</div>
              </div>
            );
          })}
        </div>

        {/* Logs View */}
        <div className="execution-logs" ref={logRef}>
          {logs.map((log, i) => (
            <div key={i} className="log-line">
              <span className="log-time">{log.match(/^\[(.*?)\]/)?.[1] || ""}</span>
              <span className="log-message">{log.replace(/^\[.*?\]\s*/, "")}</span>
            </div>
          ))}
          {logs.length === 0 && !isRunning && (
            <div className="empty-logs">Nenhuma execução ainda. Clique em "Executar" para iniciar.</div>
          )}
        </div>

        {/* Timeline View */}
        <div className="execution-timeline">
          {execution && (
            <div className="timeline-item">
              <div className="timeline-marker" />
              <div className="timeline-content">
                <span className="timeline-time">{new Date(execution.startedAt).toLocaleTimeString()}</span>
                <span className="timeline-event">Pipeline iniciado</span>
              </div>
            </div>
          )}
          {logs.slice(0, 10).map((log, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-marker" />
              <div className="timeline-content">
                <span className="timeline-time">{log.match(/^\[(.*?)\]/)?.[1] || ""}</span>
                <span className="timeline-event">{log.replace(/^\[.*?\]\s*/, "")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Pipeline Node Component
interface PipelineNodeProps {
  node: PipelineNode;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (e: DragEvent, nodeId: string) => void;
  onDragEnd: (e: DragEvent, nodeId: string) => void;
  onConnect: (params: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => void;
  readOnly: boolean;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

function PipelineNode({ 
  node, 
  selected, 
  onSelect, 
  onDragStart, 
  onDragEnd, 
  onConnect, 
  readOnly, 
  position, 
  onPositionChange,
  config,
  onConfigChange
}: PipelineNodeProps) {
  const nodeType = NODE_TYPES[node.type];
  const isDragging = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (e.target !== e.currentTarget) return;
    
    isDragging.current = true;
    dragStartRef.current = { x: e.clientX, y: 0 };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    const newPos = { x: newX, y: newY };
    const snapped = NODE_TYPES[node.type]?.inputs === 0 && NODE_TYPES[node.type]?.outputs === 0 
      ? newPos 
      : snapToGrid(newPos);
    
    onPositionChange(snapped);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("node-id", node.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData("node-id");
    // Handle drop on node for connection
  };

  const handleConnectStart = (e: React.MouseEvent, handle: "input" | "output") => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={nodeRef}
      className={`pipeline-node ${node.type} ${selected ? "selected" : ""}`}
      style={{ 
        left: position.x, 
        top: position.y,
        width: NODE_WIDTH,
        transform: `translate(${position.x}px, ${position.y}px)`
      } as React.CSSProperties}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={e => { e.stopPropagation(); onSelect(node.id); }}
      draggable={!readOnly}
      onDragStart={handleDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      data-node-id={node.id}
    >
      {/* Node Header */}
      <div className="node-header">
        <span className="node-icon" style={{ backgroundColor: NODE_TYPES[node.type]?.color }}>
          {NODE_TYPES[node.type]?.icon}
        </span>
        <span className="node-label">{node.label}</span>
        {node.disabled && <span className="node-badge disabled">Desativado</span>}
        <div className="node-actions">
          <button 
            className="node-action-btn" 
            onClick={e => { e.stopPropagation(); }}
            title="Configurar"
          ><Settings size={12} /></button>
          <button 
            className="node-action-btn danger" 
            onClick={e => { e.stopPropagation(); /* deleteNode(node.id) */ }}
            title="Excluir"
          ><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Input Handles */}
      {NODE_TYPES[node.type]?.inputs > 0 && (
        <div className="node-handles inputs">
          {Array.from({ length: NODE_TYPES[node.type]?.inputs || 0 }, (_, i) => (
            <div 
              key={`in-${i}`}
              className="node-handle input"
              onMouseDown={e => handleConnectStart(e, "input")}
              data-handle="input"
              data-index={i}
            />
          ))}
        </div>
      )}

      {/* Node Config Preview */}
      {!readOnly && Object.keys(config).length > 0 && (
        <div className="node-config-preview">
          {Object.entries(config).slice(0, 2).map(([key, value]) => (
            <div key={key} className="config-preview-item">
              <span className="config-key">{key}:</span>
              <span className="config-value">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
            </div>
          ))}
          {Object.keys(config).length > 2 && (
            <div className="config-more">+{Object.keys(config).length - 2} mais</div>
          )}
        </div>
      )}

      {/* Output Handles */}
      {NODE_TYPES[node.type]?.outputs > 0 && (
        <div className="node-handles outputs">
          {Array.from({ length: NODE_TYPES[node.type]?.outputs || 0 }, (_, i) => (
            <div 
              key={`out-${i}`}
              className="node-handle output"
              onMouseDown={e => /* handleConnectStart */ null}
              data-handle="output"
              data-index={i}
            />
          ))}
        </div>
      )}

      {/* Selection indicator */}
      {selected && <div className="node-selection-ring" />}
    </div>
  );
}

function handleNodeDragStart(e: React.DragEvent, nodeId: string) {
  e.dataTransfer.setData("node-id", nodeId);
  e.dataTransfer.effectAllowed = "move";
}

function handleNodeDragEnd(e: React.DragEvent) {
  e.preventDefault();
}

function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  const nodeId = e.dataTransfer.getData("node-id");
  // Handle drop for connections
}

function handleConnectStart(e: React.MouseEvent, handle: "input" | "output") {
  e.preventDefault();
  e.stopPropagation();
  // Start connection
}

function handleConnect(params: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) {
  // Add edge
}

export default PipelineBuilder;