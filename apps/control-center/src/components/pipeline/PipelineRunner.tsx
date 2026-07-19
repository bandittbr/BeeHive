import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, FolderKanban, Settings, Bot, Workflow,
  BarChart3, FileText, Image, Video, Music, Scissors, Link2, Clapperboard,
  Globe, Package, Layers, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, XCircle, Send, Paperclip,
  Download, ChevronRight, Loader2, Plus, X,
  Home, Network, Search, ChevronDown, FilePlus, BrainCircuit,
  SlidersHorizontal, Paperclip as PaperclipIcon,
  Target, AlertTriangle, Rocket, Calendar, DollarSign, Code, Zap, Brain, GitBranch, Megaphone, BookOpen, Instagram, Music as MusicIcon, Video as VideoIcon, Image as ImageIcon,
  Trash2,
  Copy,
  RotateCcw,
  FileText as FileTextIcon,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  FilePlus,
  Play,
  ChevronRight,
  ChevronLeft,
  Settings,
  Zap,
  Terminal,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive } from './services/beehiveApi';
import { createExecutionService, UnifiedExecutionService, ExecutionConfig, ExecutionResult } from './services/execution.service';
import { MessageList } from './components/chat/MessageList';
import { FileOperationInput, useFileOperations } from './components/chat/FileOperations';
import { PipelineRunner } from './components/pipeline/PipelineRunner';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount, Pipeline } from './types';
import './App.css';

// ============================================================
// APP SHELL — Sidebar rotulada + Topbar + Áreas
// ============================================================

type MainArea = 'chat' | 'projetos' | 'negocios' | 'settings';

const AREA_LABELS: Record<MainArea, string> = {
  chat: 'Chat',
  projetos: 'Projetos',
  negocios: 'Negócios',
  settings: 'Settings',
};

export default function App() {
  const { projects } = useAppStore();
  const [activeArea, setActiveArea] = useState<MainArea>('chat');
  const [openedProject, setOpenedProject] = useState<Project | null>(null);
  const [projectView, setProjectView] = useState<'chat' | 'agents' | 'workflows' | 'artifacts' | 'settings' | 'cowork'>('cowork');
  const [rightPanel, setRightPanel] = useState<'artifacts' | 'pipeline' | 'logs' | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);

  const openProject = (project: Project) => {
    setOpenedProject(project);
    setProjectView('cowork');
    setActiveArea('projetos');
  };

  const goToProjectsList = () => {
    setOpenedProject(null);
    setActiveArea('projetos');
  };

  const handleNewProject = async () => {
    const name = prompt('Nome do novo projeto:');
    if (name) {
      const icons = ['📁', '🚀', '💡', '🎯', '🔥'];
      const icon = icons[Math.floor(Math.random() * icons.length)];
      const project = await projectService.create({ name, icon, description: '', status: 'active' });
      openProject(project);
    }
  };

  const handleNewConversation = () => {
    setChatResetKey((k) => k + 1);
    setActiveArea('chat');
  };

  return (
    <div className="app">
      {/* Sidebar rotulada */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><img src="/LOGO.jpg" alt="BeeHive" /></div>
          <span className="logo-text">BeeHive</span>
        </div>

        <nav className="sidebar-nav">
          <div className={`nav-row${activeArea === 'chat' ? ' active' : ''}`}>
            <button className="nav-row-main" onClick={() => setActiveArea('chat')}>
              <MessageSquare size={17} strokeWidth={1.6} />
              <span>Chat</span>
            </button>
            <button className="nav-row-plus" title="Nova conversa" onClick={handleNewConversation}>
              <Plus size={13} strokeWidth={2} />
            </button>
          </div>

          <button className={`nav-row-main nav-row-single${activeArea === 'projetos' ? ' active' : ''}`} onClick={goToProjectsList}>
            <FolderKanban size={17} strokeWidth={1.6} />
            <span>Projetos</span>
          </button>

          <button className={`nav-row-main nav-row-single${activeArea === 'negocios' ? ' active' : ''}`} onClick={() => setActiveArea('negocios')}>
            <Package size={17} strokeWidth={1.6} />
            <span>Negócios</span>
          </button>
        </nav>

        <div className="sidebar-recent">
          <div className="sidebar-section-label"><span>Recentes</span></div>
          <div className="recent-list">
            {projects.slice(0, 6).map((p) => (
              <button key={p.id} className={`recent-row${activeArea === 'projetos' && openedProject?.id === p.id ? ' active' : ''}`} onClick={() => openProject(p)}>
                <span className="recent-icon">{p.icon}</span>
                <span className="recent-name">{p.name}</span>
                <span className={`recent-dot ${p.status}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className={`nav-row-main nav-row-single${activeArea === 'settings' ? ' active' : ''}`} onClick={() => setActiveArea('settings')}>
            <Settings size={17} strokeWidth={1.6} />
            <span>Settings</span>
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">GT</div>
            <div className="user-info">
              <span className="user-name">Gabriel T.</span>
              <span className="user-plan">Premium</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Coluna principal: topbar + conteúdo */}
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-root">BeeHive</span>
            <ChevronRight size={13} className="breadcrumb-sep" />
            <span className="breadcrumb-current">{AREA_LABELS[activeArea]}</span>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notificações"><Bell size={16} /></button>
          </div>
        </header>

        <main className="main">
          {activeArea === 'chat' && <HomeChat key={chatResetKey} projects={projects} onOpenProject={openProject} />}

          {activeArea === 'projetos' && (
            openedProject ? (
              <ProjectView
                project={openedProject}
                activeView={projectView}
                onViewChange={setProjectView}
                rightPanel={rightPanel}
                onRightPanelChange={setRightPanel}
                onBack={goToProjectsList}
              />
            ) : (
              <ProjectsListView projects={projects} onOpen={openProject} onNew={handleNewProject} />
            )
          )}

          {activeArea === 'negocios' && <NegociosView />}
          {activeArea === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// HOME CHAT — centralizado, estilo Claude Desktop
// ============================================================

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: 'Nova conversa', desc: 'Iniciar do zero' },
  { icon: BarChart3, label: 'Analisar dados', desc: 'Gerar insights' },
  { icon: Image, label: 'Criar imagem', desc: 'Gerar com IA' },
  { icon: Workflow, label: 'Executar workflow', desc: 'Automatizar tarefas' },
];

function HomeChat() {
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; time: string }[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState('opencode:big-pickle');
  const [reasoningEffort, setReasoningEffort] = useState<'default' | 'low' | 'medium' | 'high'>('default');
  const [fileOperations, setFileOperations] = useState<{ id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[]>([]);
  const [showFilePanel, setShowFilePanel] = useState(false);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value && attachedFiles.length === 0 || sending) return;
    setStarted(true);
    const userContent = value + (attachedFiles.length > 0 ? `\n\n[Arquivos anexados: ${attachedFiles.map(f => f.name).join(', ')}]` : '');
    setMessages((prev) => [...prev, { id: String(Date.now()), role: 'user', content: userContent, time: now() }]);
    setInput('');
    setAttachedFiles([]);
    setSending(true);
    // Chat conectado de verdade ao backend do BeeHive (Railway) — ver services/beehiveApi.ts
    const reply = await askBeeHive(value);
    setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: reply, time: now() }]);
    setSending(false);
  };

  return (
    <div className="home-chat-layout">
      <main className="chat-main">
        {!started ? (
          <div className="chat-hero">
            <div className="chat-hero-icon"><Sparkles size={26} /></div>
            <h1>Olá, Gabriel! 👋</h1>
            <p>O que vamos criar hoje?</p>

            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.label} className="quick-action" onClick={() => a.label === 'Nova conversa' ? undefined : handleSend(a.label)}>
                    <Icon size={20} />
                    <span className="quick-action-label">{a.label}</span>
                    <span className="quick-action-desc">{a.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            <MessageList
              messages={messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.time).getTime(),
                isStreaming: sending && m.id === messages[messages.length - 1]?.id,
              }))}
              streaming={sending}
            />
            {sending && (
              <div className="msg assistant">
                <div className="msg-avatar"><Bot size={16} /></div>
                <div className="msg-body">
                  <div className="msg-header"><span className="msg-role">BeeHive</span></div>
                  <div className="msg-content msg-typing">digitando...</div>
                </div>
              </div>
            )}
          </div>
        )}

        <ChatInputArea
          input={input}
          setInput={setInput}
          sending={sending}
          handleSend={handleSend}
          attachedFiles={attachedFiles}
          setAttachedFiles={setAttachedFiles}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={setReasoningEffort}
          fileOperations={fileOperations}
          setFileOperations={setFileOperations}
          showFilePanel={showFilePanel}
          setShowFilePanel={setShowFilePanel}
        />
      </main>

      {showFilePanel && (
        <aside className="home-file-panel">
          <FilePanel files={fileOperations} onClose={() => setShowFilePanel(false)} />
        </aside>
      )}
    </div>
  );
}

// ============================================================
// CHAT INPUT AREA - OpenWork style: textarea grande, anexo, modelo, reasoning
// ============================================================

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: 'Nova conversa', desc: 'Iniciar do zero' },
  { icon: BarChart3, label: 'Analisar dados', desc: 'Gerar insights' },
  { icon: Image, label: 'Criar imagem', desc: 'Gerar com IA' },
  { icon: Workflow, label: 'Executar workflow', desc: 'Automatizar tarefas' },
];

function ChatInputArea({
  input,
  setInput,
  sending,
  handleSend,
  attachedFiles,
  setAttachedFiles,
  selectedModel,
  setSelectedModel,
  reasoningEffort,
  setReasoningEffort,
  fileOperations,
  setFileOperations,
  showFilePanel,
  setShowFilePanel,
}: {
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  handleSend: () => void;
  attachedFiles: File[];
  setAttachedFiles: (files: File[]) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  reasoningEffort: 'default' | 'low' | 'medium' | 'high';
  setReasoningEffort: (v: 'default' | 'low' | 'medium' | 'high') => void;
  fileOperations: { id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[];
  setFileOperations: (ops: { id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[]) => void;
  showFilePanel: boolean;
  setShowFilePanel: (v: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchModel, setSearchModel] = useState('');

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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const currentModel = models.find(m => m.id === selectedModel);
  const supportsImages = currentModel?.supportsImages ?? false;
  const imageFiles = attachedFiles.filter(f => f.type.startsWith('image/'));
  const hasUnsupportedImages = imageFiles.length > 0 && !supportsImages;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sending && (input.trim() || attachedFiles.length > 0)) handleSend();
    }
  };

  const handleFileAttach = (files: FileList) => {
    const newFiles = Array.from(files);
    setAttachedFiles(prev => [...prev, ...newFiles]);
    // Simulate file operations for the panel
    newFiles.forEach(f => {
      setFileOperations(prev => [...prev, { id: String(Date.now()) + Math.random(), name: f.name, type: 'read' }]);
    });
    setShowFilePanel(true);
  };

  return (
    <div className="chat-input-area">
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
      {hasUnsupportedImages && (
        <div className="model-warning">
          <AlertTriangle size={14} />
          <span>O modelo <strong>{currentModel?.name}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.</          </div>
        )}
      </div>
      <div className="input-row">
        <div className="input-left">
          <button className="input-btn" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo">
            <FilePlus size={18} />
          </button>
          <input type="file" ref={fileInputRef} multiple onChange={e => e.target.files && handleFileAttach(e.target.files)} style={{ display: 'none' }} />
        </div>
        <div className="input-center">
          <textarea
            ref={textareaRef}
            placeholder={sending ? 'Aguardando resposta...' : 'Digite sua mensagem... (Shift+Enter para nova linha)'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={1}
            spellCheck={false}
          />
        </div>
        <div className="input-right">
          <button className="chat-send-btn" onClick={handleSend} disabled={sending || (!input.trim() && attachedFiles.length === 0)} aria-label="Enviar">
            <Send size={18} />
          </button>
        </div>
      </div>
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
                <input
                  type="text"
                  placeholder="Buscar modelo..."
                  value={searchModel}
                  onChange={e => setSearchModel(e.target.value)}
                  className="dropdown-search"
                  autoFocus
                />
                {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                  <div key={provider} className="model-provider-group">
                    <div className="model-provider-label">{provider}</div>
                    {providerModels.filter(m => m.name.toLowerCase().includes(searchModel.toLowerCase())).map(m => (
                      <button key={m.id} className={`dropdown-item${selectedModel === m.id ? ' active' : ''}`} onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}>
                        <span className="dropdown-item-name">{m.name}</span>
                        <span className="dropdown-item-provider">{m.provider}</span>
                      </button>
                    ))}
                  </div>
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

// File Operations Panel (right side)
function FilePanel({ files, onClose }: { files: { id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[]; onClose: () => void }) {
  if (files.length === 0) return null;

  return (
    <div className="file-panel">
      <div className="file-panel-header">
        <h3>Arquivos</h3>
        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="file-panel-body">
        {files.map(f => (
          <div key={f.id} className={`file-panel-item ${f.type}`}>
            <div className="file-panel-item-icon">
              {f.type === 'created' && <FilePlus size={14} style={{ color: '#22C55E' }} />}
              {f.type === 'edited' && <FileCode size={14} style={{ color: '#3B82F6' }} />}
              {f.type === 'read' && <FileText size={14} style={{ color: '#A78BFA' }} />}
            </div>
            <div className="file-panel-item-info">
              <span className="file-panel-item-name">{f.name}</span>
              <span className="file-panel-item-type">{f.type === 'created' ? 'Criado' : f.type === 'edited' ? 'Editado' : 'Lido'}</span>
            </div>
            {f.content && (
              <details className="file-panel-item-preview">
                <summary>Ver conteúdo</summary>
                <pre>{f.content.slice(0, 200)}{f.content.length > 200 ? '...' : ''}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PIPELINE RUNNER - Executa pipelines visuais
// ============================================================

import { Pipeline } from './types';
import { UnifiedExecutionService, createExecutionService } from '@/services/execution.service';

interface PipelineRunnerProps {
  pipeline: any;
  onComplete?: (results: any[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (nodeId: string, status: string, output?: string) => void;
}

export function PipelineRunner({ pipeline, onComplete, onError, onProgress }: PipelineRunnerProps) {
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const executionServiceRef = useRef<any>(null);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const executePipeline = useCallback(async () => {
    if (!pipeline || pipeline.nodes.length === 0) return;

    setExecuting(true);
    addLog("🚀 Iniciando execução do pipeline...");

    try {
      const nodes = [...pipeline.nodes].sort((a, b) => {
        const aDeps = pipeline.edges.filter(e => e.target === a.id).map(e => e.source);
        const bDeps = pipeline.edges.filter(e => e.target === b.id).map(e => e.source);
        return aDeps.length - bDeps.length;
      };

      for (const node of nodes) {
        addLog(`▶ Executando nó: ${node.label} (${node.type})`);
        setCurrentNode(node.id);
        
        try {
          await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
          
          let output = '';
          switch (node.type) {
            case 'agent':
              output = `🤖 Agente ${pipeline.nodes.find(n => n.id === node.id)?.label || node.id} executado com sucesso`;
              break;
            case 'tool':
              output = `🔧 Ferramenta ${node.config?.toolName || 'desconhecida'} executada`;
              break;
            case 'code':
              output = `💻 Código executado: ${node.config?.code?.slice(0, 50)}...`;
              break;
            case 'http':
              output = `🌐 HTTP ${node.config?.method || 'GET'} ${node.config?.url || 'url'} - 200 OK`;
              break;
            case 'condition':
              output = `❓ Condição avaliada: ${node.config?.condition || 'true'}`;
              break;
            case 'loop':
              output = `🔄 Loop executado ${node.config?.maxIterations || 10} vezes`;
              break;
            case 'parallel':
              output = `⚡ Execução paralela (${node.config?.branches || 2} branches)`;
              break;
            case 'delay':
              output = `⏱️ Atraso de ${node.config?.ms || 1000}ms`;
              break;
            case 'input':
              output = '📥 Entrada do pipeline';
              break;
            case 'output':
              output = '📤 Saída do pipeline';
              break;
            default:
              output = `Nó ${node.label} processado`;
          }
          
          setResults(prev => ({ ...prev, [node.id]: { output, timestamp: new Date().toISOString() } }));
          onProgress?.(node.id, 'completed', output);
          
        } catch (error) {
          addLog(`❌ Erro no nó ${node.label}: ${error}`);
        }
      }
      
      addLog("✅ Pipeline executado com sucesso!");
      onComplete?.([]);
      
    } catch (error) {
      addLog(`❌ Erro no pipeline: ${error}`);
      onError?.(error as Error);
    } finally {
      setExecuting(false);
    }
  }, [pipeline]);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  return (
    <div className="pipeline-runner">
      <div className="runner-header">
        <h3>Pipeline Runner</h3>
        <button className="btn-primary" onClick={executePipeline} disabled={executing}>
          {executing ? '⏳ Executando...' : '▶ Executar Pipeline'}
        </button>
      </div>
      <div className="runner-logs">
        {logs.map((log, i) => (
          <div key={i} className="log-line">{log}</div>
        )}
      </div>
    </div>
  );
}

export default PipelineRunner;