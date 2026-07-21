"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  Plus, Trash2, Copy, ZoomIn, ZoomOut, Home, Save, Play, Settings,
  ChevronDown, X, Bot, Zap, GitBranch, Terminal, Code2, Globe, Database,
  Clock, RotateCcw, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import "./PipelineBuilder.css"

export type NodeType =
  | "agent" | "tool" | "condition" | "loop"
  | "input" | "output" | "parallel" | "delay"
  | "code" | "http" | "db"

export interface PipelineNode {
  id: string
  type: string
  label: string
  position: { x: number; y: number }
  config: Record<string, any>
  inputs: string[]
  outputs: string[]
  disabled?: boolean
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Pipeline {
  id: string
  name: string
  description: string
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  createdAt: string
  updatedAt: string
}

export const NODE_TYPES: Record<string, {
  label: string
  icon: string
  color: string
  description: string
  defaultConfig: Record<string, any>
  inputs: number
  outputs: number
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
}

const NODE_WIDTH = 220
const NODE_HEADER_HEIGHT = 44

function generateId() {
  return crypto.randomUUID().slice(0, 8)
}

function snapToGrid(value: number, gridSize = 20) {
  return Math.round(value / gridSize) * gridSize
}

function getBezierPath(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const dx = Math.abs(targetX - sourceX)
  const offset = Math.max(50, dx * 0.5)
  return `M ${sourceX} ${sourceY} C ${sourceX + offset} ${sourceY}, ${targetX - offset} ${targetY}, ${targetX} ${targetY}`
}

export interface PipelineBuilderProps {
  pipeline?: Pipeline
  project?: any
  onSave?: (pipeline: Pipeline) => void
  onRun?: (pipeline: Pipeline) => void
  readOnly?: boolean
  className?: string
}

export function PipelineBuilder({
  pipeline: initialPipeline,
  project,
  onSave,
  onRun,
  readOnly = false,
  className,
}: PipelineBuilderProps) {
  const [pipeline, setPipeline] = useState<Pipeline>(initialPipeline || {
    id: generateId(),
    name: "Novo Workflow",
    description: "",
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [connecting, setConnecting] = useState<{ sourceId: string; sourceHandle: number; x: number; y: number } | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [isRunning, setIsRunning] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const selectedNode = useMemo(
    () => pipeline.nodes.find((n) => n.id === selectedNodeId) || null,
    [pipeline.nodes, selectedNodeId]
  )

  const updateNode = useCallback((id: string, changes: Partial<PipelineNode>) => {
    setPipeline((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    }))
  }, [])

  const addNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const config = NODE_TYPES[type]
    if (!config) return

    const newNode: PipelineNode = {
      id: generateId(),
      type,
      label: config.label,
      position: position || { x: 200 - pan.x / zoom, y: 200 - pan.y / zoom },
      config: { ...config.defaultConfig },
      inputs: [],
      outputs: [],
    }

    setPipeline((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      nodes: [...prev.nodes, newNode],
    }))
  }, [pan, zoom])

  const deleteNode = useCallback((id: string) => {
    setPipeline((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      nodes: prev.nodes.filter((n) => n.id !== id),
      edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
    }))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }, [selectedNodeId])

  const duplicateNode = useCallback((id: string) => {
    const node = pipeline.nodes.find((n) => n.id === id)
    if (!node) return

    const newNode: PipelineNode = {
      ...node,
      id: generateId(),
      label: node.label + " (cópia)",
      position: { x: node.position.x + 30, y: node.position.y + 30 },
    }

    setPipeline((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      nodes: [...prev.nodes, newNode],
    }))
  }, [pipeline.nodes])

  const addEdge = useCallback((edge: PipelineEdge) => {
    setPipeline((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      edges: [...prev.edges.filter((e) => !(e.source === edge.source && e.sourceHandle === edge.sourceHandle)), edge],
    }))
  }, [])

  const deleteEdge = useCallback((id: string) => {
    setPipeline((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      edges: prev.edges.filter((e) => e.id !== id),
    }))
  }, [])

  // Node dragging
  const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return
    e.stopPropagation()
    const node = pipeline.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom
    dragOffset.current = { x: x - node.position.x, y: y - node.position.y }
    setDraggingNode(nodeId)
    setSelectedNodeId(nodeId)
  }, [pipeline.nodes, pan, zoom, readOnly])

  // Canvas panning
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current && !(e.target as HTMLElement).classList.contains("pipeline-viewport")) return
    setSelectedNodeId(null)
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  useEffect(() => {
    if (!draggingNode && !isPanning && !connecting) return

    const onMouseMove = (e: MouseEvent) => {
      if (draggingNode) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.current.x
        const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.current.y
        updateNode(draggingNode, { position: { x: snapToGrid(x), y: snapToGrid(y) } })
      } else if (isPanning) {
        setPan({
          x: panStart.current.panX + (e.clientX - panStart.current.x),
          y: panStart.current.panY + (e.clientY - panStart.current.y),
        })
      } else if (connecting) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        setConnecting((prev) => prev ? {
          ...prev,
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        } : null)
      }
    }

    const onMouseUp = () => {
      setDraggingNode(null)
      setIsPanning(false)
      if (connecting) setConnecting(null)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [draggingNode, isPanning, connecting, pan, zoom, updateNode])

  // Handle output -> input connection
  const onOutputMouseDown = useCallback((e: React.MouseEvent, nodeId: string, handleIndex: number) => {
    if (readOnly) return
    e.stopPropagation()
    const node = pipeline.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const config = NODE_TYPES[node.type]
    const handleX = node.position.x + NODE_WIDTH + 10
    const handleY = node.position.y + NODE_HEADER_HEIGHT + 30 + handleIndex * 24

    setConnecting({ sourceId: nodeId, sourceHandle: handleIndex, x: handleX, y: handleY })
  }, [pipeline.nodes, readOnly])

  const onInputMouseUp = useCallback((e: React.MouseEvent, nodeId: string, handleIndex: number) => {
    if (!connecting || readOnly) return
    e.stopPropagation()
    if (connecting.sourceId === nodeId) return

    addEdge({
      id: generateId(),
      source: connecting.sourceId,
      target: nodeId,
      sourceHandle: String(connecting.sourceHandle),
      targetHandle: String(handleIndex),
    })
    setConnecting(null)
  }, [connecting, addEdge, readOnly])

  // Zoom with scroll
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setZoom((z) => Math.min(2, Math.max(0.25, z - e.deltaY * 0.001)))
      }
    }

    canvas.addEventListener("wheel", onWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", onWheel)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) deleteNode(selectedNodeId)
      }
      if (e.key === "Escape") {
        setSelectedNodeId(null)
        setConnecting(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedNodeId, deleteNode])

  const handleRun = useCallback(async () => {
    setIsRunning(true)
    onRun?.(pipeline)
    setTimeout(() => setIsRunning(false), 2000)
  }, [onRun, pipeline])

  const handleSave = useCallback(() => {
    onSave?.(pipeline)
  }, [onSave, pipeline])

  return (
    <div className={cn("pipeline-builder", className)}>
      {/* Toolbar */}
      <div className="pipeline-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            value={pipeline.name}
            onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
            className="bg-transparent border-none text-sm font-semibold text-[var(--text)] w-48 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] rounded px-2 py-1"
            readOnly={readOnly}
          />
        </div>
        <div className="toolbar-center">
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(2, z + 0.1))} title="Zoom in">
              <ZoomIn size={16} />
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))} title="Zoom out">
              <ZoomOut size={16} />
            </button>
            <button className="zoom-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} title="Reset view">
              <Home size={16} />
            </button>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={() => setShowRightPanel((v) => !v)}>
            <Settings size={14} /> Painel
          </button>
          {!readOnly && onSave && (
            <button className="toolbar-btn" onClick={handleSave}>
              <Save size={14} /> Salvar
            </button>
          )}
          {onRun && (
            <button className="toolbar-btn primary" onClick={handleRun} disabled={isRunning}>
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {isRunning ? "Executando..." : "Executar"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="pipeline-canvas"
          onMouseDown={onCanvasMouseDown}
          style={{ cursor: isPanning ? "grabbing" : "default" }}
        >
          <div
            className="pipeline-viewport"
            style={{
              "--pan-x": `${pan.x}px`,
              "--pan-y": `${pan.y}px`,
              "--zoom": zoom,
            } as React.CSSProperties}
          >
            {/* SVG connections */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
              {pipeline.edges.map((edge) => {
                const sourceNode = pipeline.nodes.find((n) => n.id === edge.source)
                const targetNode = pipeline.nodes.find((n) => n.id === edge.target)
                if (!sourceNode || !targetNode) return null

                const sourceConfig = NODE_TYPES[sourceNode.type]
                const targetConfig = NODE_TYPES[targetNode.type]
                const sIdx = parseInt(edge.sourceHandle || "0")
                const tIdx = parseInt(edge.targetHandle || "0")

                const sx = sourceNode.position.x + NODE_WIDTH + 10
                const sy = sourceNode.position.y + NODE_HEADER_HEIGHT + 30 + sIdx * 24
                const tx = targetNode.position.x - 10
                const ty = targetNode.position.y + NODE_HEADER_HEIGHT + 30 + tIdx * 24

                return (
                  <path
                    key={edge.id}
                    d={getBezierPath(sx, sy, tx, ty)}
                    className="connection-path"
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={() => deleteEdge(edge.id)}
                  />
                )
              })}

              {/* Connecting preview */}
              {connecting && (
                <path
                  d={getBezierPath(
                    pipeline.nodes.find((n) => n.id === connecting.sourceId)
                      ? pipeline.nodes.find((n) => n.id === connecting.sourceId)!.position.x + NODE_WIDTH + 10
                      : connecting.x,
                    pipeline.nodes.find((n) => n.id === connecting.sourceId)
                      ? pipeline.nodes.find((n) => n.id === connecting.sourceId)!.position.y + NODE_HEADER_HEIGHT + 30 + connecting.sourceHandle * 24
                      : connecting.y,
                    connecting.x,
                    connecting.y
                  )}
                  className="connection-preview"
                />
              )}
            </svg>

            {/* Nodes */}
            {pipeline.nodes.map((node) => {
              const config = NODE_TYPES[node.type]
              const isSelected = selectedNodeId === node.id

              return (
                <div
                  key={node.id}
                  className={cn("pipeline-node", isSelected && "selected", draggingNode === node.id && "dragging", node.disabled && "disabled")}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    width: NODE_WIDTH,
                  }}
                  onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                >
                  {/* Header */}
                  <div className="node-header" style={{ borderBottomColor: config?.color || "#6B7280" }}>
                    <div className="node-icon" style={{ background: config?.color || "#6B7280" }}>
                      {config?.icon || "?"}
                    </div>
                    <span className="node-label">{node.label}</span>
                    {!readOnly && (
                      <div className="node-actions">
                        <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); duplicateNode(node.id) }} title="Duplicar">
                          <Copy size={12} />
                        </button>
                        <button className="node-action-btn" onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} title="Excluir">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Config summary */}
                  <div className="node-config">
                    {Object.entries(node.config).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="config-item">
                        <span className="config-key">{key}</span>
                        <span className="config-value">{String(value).slice(0, 30)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Handles */}
                  <div className="node-handles">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Array.from({ length: config?.inputs || 0 }, (_, i) => (
                        <div
                          key={i}
                          className="node-handle input"
                          onMouseUp={(e) => onInputMouseUp(e, node.id, i)}
                          title="Input"
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Array.from({ length: config?.outputs || 0 }, (_, i) => (
                        <div
                          key={i}
                          className="node-handle output"
                          onMouseDown={(e) => onOutputMouseDown(e, node.id, i)}
                          title="Output"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty state */}
          {pipeline.nodes.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                <Plus size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Arraste nós do painel lateral</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>ou clique em um tipo de nó para adicionar</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {showRightPanel && (
          <div className="right-panel">
            <div className="panel-tab">
              <div className="tab-buttons">
                <button className={cn("tab-btn", !selectedNode && "active")} onClick={() => setSelectedNodeId(null)}>
                  Nós
                </button>
                <button className={cn("tab-btn", !!selectedNode && "active")} onClick={() => {}} disabled={!selectedNode}>
                  Propriedades
                </button>
              </div>
            </div>

            {!selectedNode ? (
              <div className="tab-content">
                <div className="node-palette">
                  {Object.entries(NODE_TYPES).map(([type, config]) => (
                    <div
                      key={type}
                      className="palette-item"
                      onClick={() => addNode(type)}
                      draggable
                      onDragEnd={(e) => {
                        const canvas = canvasRef.current
                        if (!canvas) return
                        const rect = canvas.getBoundingClientRect()
                        const x = (e.clientX - rect.left - pan.x) / zoom
                        const y = (e.clientY - rect.top - pan.y) / zoom
                        addNode(type, { x: snapToGrid(x), y: snapToGrid(y) })
                      }}
                    >
                      <div className="palette-item-icon" style={{ background: config.color + "20", color: config.color }}>
                        {config.icon}
                      </div>
                      <div className="palette-item-info">
                        <div className="palette-item-name">{config.label}</div>
                        <div className="palette-item-desc">{config.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tab-content">
                <div className="config-field">
                  <label>Nome</label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                  />
                </div>
                <div className="config-field">
                  <label>Tipo</label>
                  <input type="text" value={NODE_TYPES[selectedNode.type]?.label || selectedNode.type} readOnly />
                </div>
                {Object.entries(selectedNode.config).map(([key, value]) => (
                  <div key={key} className="config-field">
                    <label>{key}</label>
                    {typeof value === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, [key]: e.target.checked } })}
                      />
                    ) : typeof value === "number" ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, [key]: Number(e.target.value) } })}
                      />
                    ) : typeof value === "string" && value.length > 50 ? (
                      <textarea
                        value={value}
                        onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, [key]: e.target.value } })}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, [key]: e.target.value } })}
                      />
                    )}
                  </div>
                ))}
                <div className="config-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedNode.disabled || false}
                      onChange={(e) => updateNode(selectedNode.id, { disabled: e.target.checked })}
                    />
                    Desativado
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="pipeline-stats">
        <div className="stat-item">
          <span>Nós:</span>
          <span className="stat-value">{pipeline.nodes.length}</span>
        </div>
        <div className="stat-item">
          <span>Conexões:</span>
          <span className="stat-value">{pipeline.edges.length}</span>
        </div>
        <div className="stat-item">
          <span>Atualizado:</span>
          <span className="stat-value">{new Date(pipeline.updatedAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}

export default PipelineBuilder
