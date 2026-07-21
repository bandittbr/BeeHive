import { useState, useRef, useEffect } from 'react';
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
  Calendar as CalendarIcon,
  Key as KeyIcon,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive, askBeeHiveStream } from './services/beehiveApi';
import { useConversations, useMessages } from './hooks/useConversations';
import { createExecutionService, UnifiedExecutionService, ExecutionConfig, ExecutionResult } from './services/execution.service';
import { MessageList } from './components/chat/MessageList';

import { PipelineRunner } from './components/pipeline/PipelineRunner';
import { CostDashboard } from './components/cost/CostDashboard';
import { EvaluationRunner } from './components/evaluation/EvaluationRunner';
import { ModelSelect } from './components/chat/ModelSelector';
import { ReasoningEffortSelect } from './components/chat/ReasoningEffortSelect';
import { Composer } from './components/chat/Composer';
import { McpSettingsPanel } from './components/chat/McpSettingsPanel';
import { PermissionApprovalModal } from './components/chat/permission-approval-modal';
import { usePermissionStore } from './stores/permissionStore';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount, Pipeline } from './types';
import './App.css';

// ============================================================
// APP SHELL — Sidebar rotulada + Topbar + Áreas
// ============================================================

type MainArea = 'chat' | 'projetos' | 'negocios' | 'evaluations' | 'settings';

const AREA_LABELS: Record<MainArea, string> = {
  chat: 'Chat',
  projetos: 'Projetos',
  negocios: 'Negócios',
  evaluations: 'Avaliações',
  settings: 'Settings',
};

export default function App() {
const { projects } = useAppStore();
  const [activeArea, setActiveArea] = useState<MainArea>('chat');
  const [openedProject, setOpenedProject] = useState<Project | null>(null);
  const [projectView, setProjectView] = useState<'cowork' | 'agents' | 'workflows' | 'pipelines' | 'artifacts' | 'settings' | 'scheduler' | 'costs'>('cowork');
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
          <div className="logo-mark"><img src="/logo.png" alt="BeeHive" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /></div>
          <span className="logo-text">BeeHive</span>
        </div>
        <div className="sidebar-nav">
          <div className="nav-group">
            <button className={`nav-row${activeArea === 'chat' ? ' active' : ''}`} onClick={() => { setActiveArea('chat'); setOpenedProject(null); }}>
              <button className="nav-row-main"><MessageSquare size={16} /> Chat</button>
              <button className="nav-row-plus" onClick={handleNewConversation}><Plus size={14} /></button>
            </button>
            <button className={`nav-row${activeArea === 'projetos' ? ' active' : ''}`} onClick={() => { setActiveArea('projetos'); setOpenedProject(null); }}>
              <button className="nav-row-main"><FolderKanban size={16} /> Projetos</button>
              <button className="nav-row-plus" onClick={handleNewProject}><Plus size={14} /></button>
            </button>
            <button className={`nav-row${activeArea === 'negocios' ? ' active' : ''}`} onClick={() => { setActiveArea('negocios'); setOpenedProject(null); }}>
              <button className="nav-row-main"><Globe size={16} /> Negócios</button>
            </button>
            <button className={`nav-row${activeArea === 'evaluations' ? ' active' : ''}`} onClick={() => { setActiveArea('evaluations'); setOpenedProject(null); }}>
              <button className="nav-row-main"><BarChart3 size={16} /> Avaliações</button>
            </button>
          </div>
          <div className="sidebar-divider" />
          <div className="nav-group">
            <button className={`nav-row${activeArea === 'settings' ? ' active' : ''}`} onClick={() => { setActiveArea('settings'); setOpenedProject(null); }}>
              <button className="nav-row-main"><Settings size={16} /> Settings</button>
            </button>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-recent" style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <div className="sidebar-section-label">Projetos Recentes</div>
            <div className="recent-list">
              {projects.slice(0, 5).map((p) => (
                <button key={p.id} className="recent-row" onClick={() => openProject(p)}>
                  <span className="recent-icon">{p.icon}</span>
                  <span className="recent-name">{p.name}</span>
                  <span className={`recent-dot ${p.status}`} />
                </button>
              ))}
              {projects.length === 0 && <div className="recent-empty">Nenhum projeto ainda</div>}
            </div>
          </div>
          <div className="sidebar-user">
            <div className="user-avatar">GT</div>
            <div className="user-info">
              <span className="user-name">Gabriel T.</span>
              <span className="user-plan">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-root" onClick={goToProjectsList}>Projetos</span>
            <span className="breadcrumb-sep">/</span>
            {openedProject ? (
              <>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{openedProject.name}</span>
              </>
            ) : (
              <span className="breadcrumb-current">{AREA_LABELS[activeArea]}</span>
            )}
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Buscar"><Search size={16} /></button>
            <button className="topbar-icon-btn" title="Notificações"><Bell size={16} /></button>
            <div className="topbar-user">
              <div className="user-avatar">GT</div>
              <div className="user-info">
                <span className="user-name">Gabriel T.</span>
                <span className="user-plan">Pro Plan</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main">
          {activeArea === 'chat' && <HomeChat key={chatResetKey} />}
          {activeArea === 'projetos' && !openedProject && <ProjectsListView projects={projects} onOpen={openProject} onNew={handleNewProject} />}
          {activeArea === 'projetos' && openedProject && <ProjectView project={openedProject} activeView={projectView} onViewChange={setProjectView} rightPanel={rightPanel} onRightPanelChange={setRightPanel} onBack={goToProjectsList} />}
          {activeArea === 'negocios' && <NegociosView />}
          {activeArea === 'evaluations' && <EvaluationRunner />}
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
  const { projects } = useAppStore();
  const [started, setStarted] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [showConversationList, setShowConversationList] = useState(false);
  const pending = usePermissionStore((s) => s.pending);
  const respondPermission = usePermissionStore((s) => s.respondPermission);

  const { projectId } = useAppStore.getState().projects.length > 0 ? { projectId: useAppStore.getState().projects[0]?.id } : { projectId: null };
  
  // Use the first project as default if available
  const firstProjectId = projects.length > 0 ? projects[0].id : null;
  
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    loadMore: loadMoreConversations,
    hasMore: hasMoreConversations,
  } = useConversations(firstProjectId);

  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState('opencode:big-pickle');
  const [reasoningEffort, setReasoningEffort] = useState<'default' | 'low' | 'medium' | 'high'>('default');
  const [fileOperations, setFileOperations] = useState<{ id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[]>([]);
  const [showFilePanel, setShowFilePanel] = useState(false);
  const { messages, loading: messagesLoading, sendMessage, setMessages } = useMessages(activeConversationId);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleNewConversation = async () => {
    if (!firstProjectId) return;
    const title = newConversationTitle || `Conversa ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const conversation = await createConversation(title, 'opencode:big-pickle', 'default');
    if (conversation) {
      setActiveConversationId(conversation.id);
      setStarted(true);
      setNewConversationTitle('');
    }
  };

  const handleSend = async (text?: string) => {
    if (!activeConversationId) {
      // Create a new conversation first
      if (!firstProjectId) return;
      const title = `Conversa ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const conversation = await createConversation(title, 'opencode:big-pickle', 'default');
      if (!conversation) return;
      setActiveConversationId(conversation.id);
      setStarted(true);
    }

    const value = (text ?? input).trim();
    if (!value || sending) return;
    setInput('');
    setAttachedFiles([]);
    setStarted(true);

    const userContent = value;
    const userMsgId = String(Date.now());
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userContent, time: now() }]);
    setSending(true);

    // Add empty assistant message for streaming
    const assistantMsgId = String(Date.now() + 1);
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', time: now() }]);

    let fullContent = '';
    await askBeeHiveStream(value, (chunk) => {
      fullContent += chunk;
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: fullContent } : m
      ));
    });

    // Ensure final content is set
    setMessages((prev) => prev.map((m) =>
      m.id === assistantMsgId ? { ...m, content: fullContent || 'Não consegui gerar uma resposta.' } : m
    ));
    setSending(false);
  };

  return (
    <div className="home-chat-layout">
      <main className="chat-main">
        {!started && !activeConversationId ? (
          <div className="chat-hero">
            <div className="chat-hero-icon"><Sparkles size={32} /></div>
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
            
            {/* Conversation list sidebar */}
            {conversations.length > 0 && (
              <div className="conversation-list">
                <h3>Conversas recentes</h3>
                <ul>
                  {conversations.map((c) => (
                    <li key={c.id} onClick={() => { setActiveConversationId(c.id); setStarted(true); }}>
                      <span className="conv-title">{c.title}</span>
                      <span className="conv-time">{new Date(c.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
                {hasMoreConversations && !conversationsLoading && (
                  <button onClick={loadMoreConversations} className="load-more">Carregar mais</button>
                )}
              </div>
            )}
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

      <aside className="conversation-sidebar">
        <div className="sidebar-header">
          <h3>Conversas</h3>
          <button onClick={() => { setActiveConversationId(null); setStarted(false); }}>Nova conversa</button>
        </div>
        <ul className="conversation-list">
          {conversations.map((c) => (
            <li key={c.id} className={activeConversationId === c.id ? 'active' : ''} onClick={() => { setActiveConversationId(c.id); setStarted(true); }}>
              <span className="conv-title">{c.title}</span>
              <span className="conv-time">{new Date(c.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      </aside>

      <PermissionApprovalModal
        permission={pending ?? { id: '', permission: 'bash', patterns: [] }}
        open={!!pending}
        respondPermission={(id, reply) => respondPermission(id, reply)}
      />
    </div>
  );
}

// Chat Input Area - OpenWork style: textarea grande, model picker agrupado por provider, reasoning effort, file attachments
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
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const currentModel = modelOptions.find(m => `${m.providerID}:${m.modelID}` === selectedModel);
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
    newFiles.forEach(f => {
      setFileOperations(prev => [...prev, { id: String(Date.now()) + Math.random(), name: f.name, type: 'read' }]);
    });
    setShowFilePanel(true);
  };

  const handleFileOperationInput = (op: { type: 'read' | 'write'; path: string; content?: string }) => {
    console.log('File operation:', op);
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
          <span>O modelo <strong>{currentModel?.title}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.</span>
        </div>
      )}

      {/* File Operations Input - removed, using Composer below */}

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
          
          {/* Center: Composer (Lexical) - fills available space */}
          <div className="input-center" style={{ flex: 1, minWidth: 0 }}>
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              disabled={sending}
              placeholder="Digite sua mensagem... (Shift+Enter para nova linha, / para comandos, @ para menções)"
              maxHeight={220}
              showToolbar={true}
            />
          </div>
          
          {/* Right: Send button */}
          <div className="input-right">
            <button className="chat-send-btn" onClick={handleSend} disabled={sending || (!input.trim() && attachedFiles.length === 0)} aria-label="Enviar">
              <Send size={18} />
            </button>
          </div>
        </div>
        
        {/* Controls row below: Model + Reasoning */}
        <div className="input-controls-row">
          <div className="input-controls">
            {/* Model Picker - usando novo componente ModelSelect */}
            <ModelSelect
              open={modelOpen}
              onOpenChange={setModelOpen}
              value={{ providerID: selectedModel.split(':')[0] || 'opencode', modelID: selectedModel.split(':')[1] || selectedModel }}
              onChange={(modelRef) => setSelectedModel(`${modelRef.providerID}:${modelRef.modelID}`)}
              options={modelOptions}
              placeholder="Select model"
            />
            
            {/* Reasoning Effort - usando novo componente ReasoningEffortSelect */}
            <ReasoningEffortSelect
              value={reasoningEffort}
              label="Raciocínio"
              options={effortOptions}
              onChange={setReasoningEffort}
            />
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
              <div className="file-panel-item-preview">{f.content.slice(0, 200)}{f.content.length > 200 ? '...' : ''}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PROJETOS — Lista de projetos
// ============================================================

function ProjectsListView({ projects, onOpen, onNew }: { projects: Project[]; onOpen: (p: Project) => void; onNew: () => void }) {
  return (
    <div className="negocios">
      <div className="page-header projects-page-header">
        <div>
          <h1>Projetos</h1>
          <p>Todos os seus projetos em um lugar</p>
        </div>
        <button className="btn-primary" onClick={onNew}><Plus size={16} /> Novo Projeto</button>
      </div>

      <div className="workflows-grid">
        {projects.map((p) => (
          <button key={p.id} className="workflow-card project-card" onClick={() => onOpen(p)}>
            <div className="workflow-card-header">
              <span className="topbar-icon">{p.icon}</span>
              <span className={`topbar-status ${p.status}`}>{p.status}</span>
            </div>
            <h3 className="workflow-card-name">{p.name}</h3>
            <p className="agent-card-task">{p.description || 'Sem descrição'}</p>
            <div className="project-card-meta">
              <span><Bot size={12} /> {p.agents.length}</span>
              <span><Workflow size={12} /> {p.workflows.length}</span>
              <span><Layers size={12} /> {p.artifacts.length}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PROJECT VIEW — Context-Aware
// ============================================================

function ProjectView({
  project, activeView, onViewChange, rightPanel, onRightPanelChange, onBack,
}: {
  project: Project;
  activeView: 'cowork' | 'agents' | 'workflows' | 'pipelines' | 'artifacts' | 'settings' | 'scheduler' | 'secrets' | 'costs';
  onViewChange: (v: 'cowork' | 'agents' | 'workflows' | 'pipelines' | 'artifacts' | 'settings' | 'scheduler' | 'secrets' | 'costs') => void;
  rightPanel: 'artifacts' | 'pipeline' | 'logs' | null;
  onRightPanelChange: (p: 'artifacts' | 'pipeline' | 'logs' | null) => void;
  onBack: () => void;
}) {
  return (
    <div className="project-view">
      <div className="project-topbar">
        <div className="topbar-left">
          <button className="btn-back" onClick={onBack}><Home size={16} /></button>
          <span className="topbar-icon">{project.icon}</span>
          <span className="topbar-name">{project.name}</span>
          <span className={`topbar-status ${project.status}`}>{project.status}</span>
        </div>
        <div className="topbar-tabs">
          <button className={`tab${activeView === 'cowork' ? ' active' : ''}`} onClick={() => onViewChange('cowork')}>
            <Terminal size={14} /> Cowork
            <span className="tab-badge">AI</span>
          </button>
          <button className={`tab${activeView === 'agents' ? ' active' : ''}`} onClick={() => onViewChange('agents')}>
            <Bot size={14} /> Agentes
            <span className="tab-badge">{project.agents.length}</span>
          </button>
          <button className={`tab${activeView === 'workflows' ? ' active' : ''}`} onClick={() => onViewChange('workflows')}>
            <Workflow size={14} /> Workflows
            <span className="tab-badge">{project.workflows.length}</span>
          </button>
          <button className={`tab${activeView === 'pipelines' ? ' active' : ''}`} onClick={() => onViewChange('pipelines')}>
            <GitBranch size={14} /> Pipelines
            <span className="tab-badge">{project.pipelines?.length || 0}</span>
          </button>
          <button className={`tab${activeView === 'artifacts' ? ' active' : ''}`} onClick={() => onViewChange('artifacts')}>
            <Layers size={14} /> Artifacts
            <span className="tab-badge">{project.artifacts.length}</span>
          </button>
          <button className={`tab${activeView === 'scheduler' ? ' active' : ''}`} onClick={() => onViewChange('scheduler')}>
            <Calendar size={14} /> Agendador
            <span className="tab-badge">{project.pipelines?.length || 0}</span>
          </button>
          <button className={`tab${activeView === 'secrets' ? ' active' : ''}`} onClick={() => onViewChange('secrets')}>
            <Key size={14} /> Secrets
            <span className="tab-badge">{project.secrets?.length || 0}</span>
          </button>
          <button className={`tab${activeView === 'costs' ? ' active' : ''}`} onClick={() => onViewChange('costs')}>
            <DollarSign size={14} /> Custos
          </button>
          <button className={`tab${activeView === 'settings' ? ' active' : ''}`} onClick={() => onViewChange('settings')}>
            <Settings size={14} /> Config
          </button>
        </div>
        <div className="topbar-right">
          <button className={`btn-icon${rightPanel === 'pipeline' ? ' active' : ''}`} onClick={() => onRightPanelChange(rightPanel === 'pipeline' ? null : 'pipeline')} title="Pipeline">
            <Network size={16} />
          </button>
          <button className={`btn-icon${rightPanel === 'artifacts' ? ' active' : ''}`} onClick={() => onRightPanelChange(rightPanel === 'artifacts' ? null : 'artifacts')} title="Artifacts">
            <Layers size={16} />
          </button>
          <button className={`btn-icon${rightPanel === 'logs' ? ' active' : ''}`} onClick={() => onRightPanelChange(rightPanel === 'logs' ? null : 'logs')} title="Logs">
            <Terminal size={16} />
          </button>
        </div>
      </div>

      <div className="project-content">
        <div className="project-main">
          {activeView === 'agents' && <ProjectAgents project={project} />}
          {activeView === 'workflows' && <ProjectWorkflows project={project} />}
          {activeView === 'pipelines' && (
            <PipelineBuilder
              pipeline={project.pipelines?.[0]}
              project={project}
              onSave={(p) => useAppStore.getState().updateProject(project.id, { pipelines: [p] })}
            />
          )}
          {activeView === 'scheduler' && (
            <div className="scheduler-view">
              <PipelineBuilder
                pipeline={project.pipelines?.[0]}
                project={project}
                onSave={(p) => useAppStore.getState().updateProject(project.id, { pipelines: [p] })}
              />
            </div>
          )}
          {activeView === 'artifacts' && <ProjectArtifacts project={project} />}
          {activeView === 'secrets' && <SecretVault project={project} />}
          {activeView === 'costs' && <CostDashboard project={project} />}
          {activeView === 'settings' && <ProjectSettings project={project} />}
        </div>

        {rightPanel && (
          <div className="project-right-panel">
            {rightPanel === 'pipeline' && <PipelinePanel project={project} />}
            {rightPanel === 'artifacts' && <ArtifactsPanel project={project} />}
            {rightPanel === 'logs' && <LogsPanel />}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROJECT CHAT (por projeto, dentro de Projetos)
// ============================================================

function ProjectChat({ project }: { project: Project }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; time: string; agent?: string }[]>([
    { id: '1', role: 'user', content: 'Analise o desempenho da última campanha.', time: '10:30' },
    { id: '2', role: 'assistant', content: 'Análise concluída para o projeto ' + project.name + '.\n\n**Métricas:**\n- ROI: 4.2x\n- CAC: R$ 42.30\n- Conversões: +23%\n\n**Recomendações:**\n- Aumentar budget em Instagram\n- Testar TikTok Ads', time: '10:31', agent: project.agents[0]?.name },
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: String(Date.now()), role: 'user' as const, content: input, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    await chatService.sendMessage(project.id, input);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'Processando no contexto do projeto ' + project.name + '...', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), agent: project.agents[0]?.name }]);
    }, 800);
  };

  return (
    <div className="project-chat">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-avatar">{m.role === 'user' ? <Users size={16} /> : <Bot size={16} />}</div>
            <div className="msg-body">
              <div className="msg-header">
                <span className="msg-role">{m.role === 'user' ? 'Você' : m.agent || project.name}</span>
                <span className="msg-time">{m.time}</span>
              </div>
              <div className="msg-content">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <div className="input-wrapper">
          <button className="input-action"><Paperclip size={16} /></button>
          <input type="text" placeholder={`Enviar para ${project.name}...`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
          <button className="input-send" onClick={handleSend}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROJECT AGENTS
// ============================================================

function ProjectAgents({ project }: { project: Project }) {
  return (
    <div className="project-agents">
      <div className="section-header">
        <h2>Agentes do Projeto</h2>
        <span className="section-count">{project.agents.length} agentes</span>
      </div>
      <div className="agents-grid">
        {project.agents.map((a: Agent) => (
          <div key={a.id} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-dot-lg" style={{ background: a.color }} />
              <div>
                <span className="agent-card-name">{a.name}</span>
                <span className={`agent-badge ${a.status}`}>{a.status}</span>
              </div>
            </div>
            <p className="agent-card-task">{a.task}</p>
            {a.pipeline && (
              <div className="agent-pipeline">
                {a.pipeline.map((step, i) => (
                  <div key={step.id} className="pipeline-step-wrapper">
                    <div className={`pipeline-step ${step.status}`}>
                      <span className="pipeline-step-label">{step.label}</span>
                      <span className={`pipeline-step-type ${step.type}`}>{step.type}</span>
                    </div>
                    {i < a.pipeline!.length - 1 && <div className={`pipeline-connector ${step.status === 'done' ? 'done' : ''}`} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PROJECT WORKFLOWS
// ============================================================

function ProjectWorkflows({ project }: { project: Project }) {
  return (
    <div className="project-workflows">
      <div className="section-header">
        <h2>Workflows</h2>
        <span className="section-count">{project.workflows.length} workflows</span>
      </div>
      {project.workflows.length === 0 ? (
        <div className="empty-state"><p>Nenhum workflow neste projeto.</p></div>
      ) : (
        <div className="workflows-grid">
          {project.workflows.map((w: WorkflowType) => (
            <div key={w.id} className="workflow-card">
              <div className="workflow-card-header">
                <div className="workflow-card-status">
                  {w.status === 'running' && <Loader2 size={16} className="spin" />}
                  {w.status === 'completed' && <CheckCircle2 size={16} />}
                  {w.status === 'error' && <XCircle size={16} />}
                  {w.status === 'scheduled' && <Clock size={16} />}
                </div>
                <span className={`workflow-badge ${w.status}`}>{w.status}</span>
              </div>
              <h3 className="workflow-card-name">{w.name}</h3>
              <div className="workflow-card-progress">
                <div className="progress-track">
                  <div className={`progress-fill ${w.status}`} style={{ width: `${w.progress}%` }} />
                </div>
                <span className="progress-label">{w.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROJECT ARTIFACTS
// ============================================================

function ProjectArtifacts({ project }: { project: Project }) {
  return (
    <div className="project-artifacts">
      <div className="section-header">
        <h2>Artifacts</h2>
        <span className="section-count">{project.artifacts.length} arquivos</span>
      </div>
      {project.artifacts.length === 0 ? (
        <div className="empty-state"><p>Nenhum artifact neste projeto.</p></div>
      ) : (
        <div className="artifacts-grid">
          {project.artifacts.map((a: Artifact) => (
            <div key={a.id} className="artifact-card">
              <div className="artifact-card-icon">
                {a.type === 'Image' && <Image size={20} />}
                {a.type === 'PDF' && <FileText size={20} />}
                {a.type === 'Video' && <Video size={20} />}
                {a.type === 'Code' && <FileCode size={20} />}
                {a.type === 'JSON' && <Database size={20} />}
                {!['Image', 'PDF', 'Video', 'Code', 'JSON'].includes(a.type) && <FileText size={20} />}
              </div>
              <div className="artifact-card-info">
                <span className="artifact-card-name">{a.name}</span>
                <span className="artifact-card-meta">{a.type} • {a.size}</span>
              </div>
              <button className="btn-icon-sm"><Download size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROJECT SETTINGS
// ============================================================

function ProjectSettings({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status);

  const handleSave = async () => {
    await projectService.update(project.id, { name, description, status });
    alert('Configurações salvas!');
  };

  return (
    <div className="project-settings">
      <div className="section-header"><h2>Configurações do Projeto</h2></div>
      <div className="settings-form">
        <div className="form-group"><label>Nome</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="form-group"><label>Descrição</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
        <button className="btn-primary" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}

// ============================================================
// PROJECT COWORK — AI Computer Control (Terminal, Bash, Files, Web)
// ============================================================

interface CoworkMessage {
  id: string;
  type: 'user' | 'assistant' | 'command' | 'output' | 'file';
  content: string;
  time: string;
  meta?: {
    command?: string;
    cwd?: string;
    exitCode?: number;
    path?: string;
  };
}

function ProjectCowork({ project }: { project: Project }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<CoworkMessage[]>([
    { id: '1', type: 'assistant', content: `🐝 **Cowork ativo no projeto ${project.name}**\n\nO BeeHive pode agora:\n🔹 **Executar comandos bash** — digite \`$ ls\` ou \`$ npm run build\`\n🔹 **Ler/Escrever arquivos** — use \`@arquivo.txt\` para ler ou \`@arquivo.txt:conteúdo\` para escrever\n🔹 **Navegar na web** — \`$ browse https://site.com\`\n🔹 **Controlar o computador** — automação via Playwright\n\nDigite um comando ou descreva o que precisa.`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [cwd, setCwd] = useState('~/projects/' + project.name.toLowerCase().replace(/\s+/g, '-'));
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    // Show command
    setMessages(prev => [...prev, { id: String(Date.now()), type: 'command', content: `$ ${trimmed}`, time: now(), meta: { command: trimmed, cwd } }]);
    setExecuting(true);

    // Simulate execution (in real app, this would call backend)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    // Mock output based on command
    let output = '';
    if (trimmed.startsWith('ls')) {
      output = `package.json\nsrc/\npublic/\nREADME.md\ndist/\nnode_modules/`;
    } else if (trimmed.startsWith('cat ') || trimmed.startsWith('type ')) {
      const file = trimmed.split(' ')[1];
      output = `// ${file}\n{\n  "name": "${project.name}",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build"\n  }\n}`;
    } else if (trimmed.startsWith('npm ') || trimmed.startsWith('yarn ') || trimmed.startsWith('pnpm ')) {
      output = `> ${trimmed}\n\n✓ Dependencies installed\n✓ Build completed in 2.3s\n\ndist/index.html  0.45 kB\ndist/assets/index.css  12.3 kB\ndist/assets/index.js   45.7 kB`;
    } else if (trimmed.startsWith('git ')) {
      output = `On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean`;
    } else if (trimmed.startsWith('browse ') || trimmed.startsWith('open ')) {
      const url = trimmed.split(' ')[1];
      output = `🌐 Navegando para: ${url}\n✓ Página carregada\n📄 Título: "Exemplo de Site"\n🔗 Links encontrados: 12`;
    } else if (trimmed === 'pwd') {
      output = cwd;
    } else if (trimmed.startsWith('cd ')) {
      const dir = trimmed.slice(3).trim();
      if (dir === '..') {
        setCwd(prev => prev.split('/').slice(0, -1).join('/') || '~');
      } else if (dir.startsWith('/')) {
        setCwd(dir);
      } else {
        setCwd(prev => prev + '/' + dir);
      }
      output = `Diretório alterado para: ${cwd}/${dir}`;
    } else {
      output = `Comando executado: ${trimmed}\n\n[Simulação] Em produção, isso executaria no shell real via backend BeeHive.`;
    }

    setMessages(prev => [...prev, { id: String(Date.now() + 1), type: 'output', content: output, time: now(), meta: { exitCode: 0, cwd } }]);
    setExecuting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && historyIndex < history.length - 1) {
      e.preventDefault();
      setHistoryIndex(i => i + 1);
      setInput(history[historyIndex + 1]);
    }
    if (e.key === 'ArrowDown' && historyIndex > -1) {
      e.preventDefault();
      setHistoryIndex(i => i - 1);
      setInput(historyIndex > 0 ? history[historyIndex - 1] : '');
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const cmds = ['ls', 'cd', 'cat', 'npm', 'git', 'pwd', 'browse', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'echo'];
      const match = cmds.find(c => c.startsWith(input.split(' ').pop() || ''));
      if (match) setInput(input.split(' ').slice(0, -1).join(' ') + (input.includes(' ') ? ' ' : '') + match + ' ');
    }
  };

  return (
    <div className="project-cowork">
      <div className="cowork-header">
        <div className="cowork-status">
          <span className="status-dot active" />
          <span>Cowork ativo</span>
          <span className="cwd">{cwd}</span>
        </div>
        <div className="cowork-actions">
          <button className="btn-icon" title="Limpar terminal" onClick={() => setMessages(messages.slice(0, 1))}><Trash2 size={14} /></button>
          <button className="btn-icon" title="Novo terminal"><Plus size={14} /></button>
        </div>
      </div>

      <div className="cowork-messages">
        {messages.map((m) => (
          <div key={m.id} className={`cowork-msg ${m.type}`}>
            {m.type === 'command' && <div className="cmd-line"><span className="prompt">{m.meta?.cwd || '~'}$</span> {m.content.replace(/^\$\s*/, '')}</div>}
            {m.type === 'output' && <pre className="cmd-output">{m.content}</pre>}
            {m.type === 'user' && <div className="user-msg">{m.content}</div>}
            {m.type === 'assistant' && <div className="assistant-msg">{m.content}</div>}
            {m.type === 'file' && <div className="file-msg">{m.meta?.path}: {m.content.slice(0, 100)}...</div>}
          </div>
        ))}
        {executing && <div className="cowork-msg executing"><span className="spinner" /> Executando...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="cowork-input">
        <span className="prompt">{cwd}$</span>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={executing ? 'Executando...' : 'Digite comando ou descreva a tarefa... (Tab: autocomplete, ↑/↓: histórico)'}
          disabled={executing}
          autoFocus
        />
      </div>
    </div>
  );
}
 
// ============================================================
// SECRET VAULT COMPONENT
// ============================================================

const secretTypes = [
  { value: "STRING", label: "Texto", icon: "🔤" },
  { value: "API_KEY", label: "API Key", icon: "🔑" },
  { value: "DATABASE_URL", label: "Database URL", icon: "🗄️" },
  { value: "OAUTH_TOKEN", label: "OAuth Token", icon: "🔐" },
  { value: "SSH_KEY", label: "SSH Key", icon: "🗝️" },
  { value: "CERTIFICATE", label: "Certificado", icon: "📜" },
];
 
function SecretVault({ project }: { project: any }) {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSecret, setEditingSecret] = useState<any | null>(null);
  const [formData, setFormData] = useState({ key: "", value: "", type: "STRING", description: "" });
 
  useEffect(() => {
    if (!project?.id) return;
    loadSecrets();
  }, [project?.id]);
 
  const loadSecrets = async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/secrets?projectId=${project.id}`);
      const data = await res.json();
      setSecrets(data.secrets || []);
    } catch (error) {
      console.error("Failed to load secrets:", error);
    } finally {
      setLoading(false);
    }
  };
 
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;
    try {
      await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, ...formData, createdBy: "current-user" }),
      });
      setShowForm(false);
      setFormData({ key: "", value: "", type: "STRING", description: "" });
      loadSecrets();
    } catch (error) {
      console.error("Failed to create secret:", error);
    }
  };
 
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSecret?.id) return;
    try {
      await fetch(`/api/secrets/${editingSecret.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: formData.value, description: formData.description }),
      });
      setShowForm(false);
      setEditingSecret(null);
      setFormData({ key: "", value: "", type: "STRING", description: "" });
      loadSecrets();
    } catch (error) {
      console.error("Failed to update secret:", error);
    }
  };
 
  const handleSubmit = (e: React.FormEvent) => {
    if (editingSecret) handleUpdate(e);
    else handleCreate(e);
  };
 
  const handleEdit = (secret: any) => {
    setEditingSecret(secret);
    setFormData({ key: secret.key, value: secret.value, type: secret.type, description: secret.description });
    setShowForm(true);
  };
 
  const handleDelete = async (secret: any) => {
    if (!confirm(`Excluir secret "${secret.key}"?`)) return;
    try {
      await fetch(`/api/secrets/${secret.id}`, { method: "DELETE" });
      loadSecrets();
    } catch (error) {
      console.error("Failed to delete secret:", error);
    }
  };
 
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado!");
  };
 
  if (showForm) {
    return (
      <div className="secret-form-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
        <div className="secret-form-modal" onClick={(e) => e.stopPropagation()}>
          <h3>{editingSecret ? "Editar Secret" : "Novo Secret"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Chave</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                placeholder="OPENAI_API_KEY"
                required={!editingSecret}
                disabled={editingSecret}
              />
            </div>
            <div className="form-group">
              <label>Valor</label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="sk-..."
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {secretTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Descrição (opcional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Para que serve este secret?"
                rows={2}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingSecret(null); setFormData({ key: "", value: "", type: "STRING", description: "" }); }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : (editingSecret ? "Atualizar" : "Criar")}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
 
  return (
    <div className="secret-vault">
      <div className="vault-header">
        <h3>🔐 Secret Vault</h3>
        <button className="btn-primary" onClick={() => { setFormData({ key: "", value: "", type: "STRING", description: "" }); setShowForm(true); }}>
          <Plus size={16} /> Novo Secret
        </button>
      </div>
 
      <div className="vault-usage">
        <h4>Como usar nos pipelines</h4>
        <p>Referencie secrets nas configurações dos nós com <span style={{fontFamily: "monospace", background: "var(--surface-2)", padding: "2px 6px", borderRadius: "4px"}}>{'{{secrets.SUA_CHAVE}}'}</span></p>
        <div className="usage-example">
          <pre>{`// Exemplo no config de um nó:
{
  "apiKey": "{{secrets.OPENAI_API_KEY}}",
  "databaseUrl": "{{secrets.DATABASE_URL}}"
}`}</pre>
        </div>
      </div>
 
      {loading ? (
        <div className="vault-loading"><Loader2 size={24} className="spin" /> Carregando...</div>
      ) : secrets.length === 0 ? (
        <div className="vault-empty">
          <Key size={48} />
          <p>Nenhum secret configurado</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Criar Primeiro Secret
          </button>
        </div>
      ) : (
        <div className="secrets-grid">
          {secrets.map(secret => (
            <div key={secret.id} className="secret-card">
              <div className="secret-header">
                <div className="secret-info">
                  <span className="secret-key">{secret.key}</span>
                  <span className="secret-type-badge">{secret.type}</span>
                </div>
                <div className="secret-actions">
                  <button className="btn-icon" onClick={() => copyToClipboard(secret.value)} title="Copiar valor">
                    <Copy size={14} />
                  </button>
                  <button className="btn-icon" onClick={() => handleEdit(secret)} title="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button className="btn-icon danger" onClick={() => handleDelete(secret)} title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="secret-meta">
                <span>Criado por: {secret.createdBy}</span>
                <span>{new Date(secret.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              {secret.description && <div className="secret-desc">{secret.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
// ============================================================
// RIGHT PANELS (dentro de um Projeto)
// ============================================================

function PipelinePanel({ project }: { project: Project }) {
  const activeAgent = project.agents.find((a) => a.pipeline && a.pipeline.length > 0);

  return (
    <div className="right-panel">
      <div className="rp-header"><span>Pipeline Visual</span></div>
      <div className="rp-body">
        {activeAgent ? (
          <div className="pipeline-view">
            <div className="pipeline-agent-label">
              <div className="agent-dot" style={{ background: activeAgent.color }} />
              <span>{activeAgent.name}</span>
            </div>
            <div className="pipeline-flow">
              {activeAgent.pipeline!.map((step, i) => (
                <div key={step.id} className="pipeline-node-wrapper">
                  <div className={`pipeline-node ${step.status} ${step.type}`}>
                    <span className="pipeline-node-label">{step.label}</span>
                    <span className="pipeline-node-type">{step.type}</span>
                  </div>
                  {i < activeAgent.pipeline!.length - 1 && <div className={`pipeline-arrow ${step.status === 'done' ? 'done' : ''}`} />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state"><p>Nenhuma pipeline ativa.</p></div>
        )}
      </div>
    </div>
  );
}

function ArtifactsPanel({ project }: { project: Project }) {
  return (
    <div className="right-panel">
      <div className="rp-header"><span>Artifacts</span></div>
      <div className="rp-body">
        {project.artifacts.length === 0 ? (
          <div className="empty-state"><p>Nenhum artifact.</p></div>
        ) : (
          <div className="rp-artifacts">
            {project.artifacts.map((a) => (
              <div key={a.id} className="rp-artifact-row">
                <FileText size={14} />
                <div className="rp-artifact-info">
                  <span className="rp-artifact-name">{a.name}</span>
                  <span className="rp-artifact-meta">{a.size}</span>
                </div>
                <button className="btn-icon-sm"><Download size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogsPanel() {
  return (
    <div className="right-panel">
      <div className="rp-header"><span>Logs</span></div>
      <div className="rp-body">
        <div className="rp-logs">
          {['[09:00] System boot', '[09:01] Kernel initialized', '[09:01] 3 plugins loaded', '[09:02] OpenRouter connected', '[09:03] Browser plugin ready'].map((l, i) => (
            <div key={i} className="rp-log-line"><code>{l}</code></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NEGÓCIOS — negócios digitais autônomos (redes sociais)
// ============================================================

interface BizTypeConfig {
  id: BizType;
  name: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  fieldLabel: string;
  fieldPlaceholder: string;
}

const BIZ_TYPES: BizTypeConfig[] = [
  {
    id: 'cortes', name: 'Cortes de Vídeos', color: '#7C3AED', icon: Scissors,
    desc: 'Pega um vídeo inteiro, encontra os melhores momentos, corta, coloca legenda bonita e publica sozinho nas redes no horário definido.',
    fieldLabel: 'Horário de postagem', fieldPlaceholder: 'Ex: 12:00, 18:00, 21:00',
  },
  {
    id: 'conteudo', name: 'Canal Dark / Criador de Conteúdo', color: '#6366F1', icon: Clapperboard,
    desc: 'Gera vídeos e conteúdo do zero de acordo com o nicho da conta — estética, fitness, infantil, humor, etc.',
    fieldLabel: 'Nicho', fieldPlaceholder: 'Ex: fitness, humor, estética...',
  },
  {
    id: 'afiliados', name: 'Afiliados', color: '#3B82F6', icon: Link2,
    desc: 'Divulga produtos com link de afiliado nas redes cadastradas para gerar vendas.',
    fieldLabel: 'Nicho / produtos', fieldPlaceholder: 'Ex: eletrônicos, moda, casa...',
  },
];

const SOCIAL_PLATFORMS: { id: SocialAccount['platform']; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'facebook', label: 'Facebook' },
];

function NegociosView() {
  return (
    <div className="negocios">
      <div className="page-header">
        <div>
          <h1>Negócios</h1>
          <p>Seus negócios digitais autônomos — cortes, criação de conteúdo e afiliados</p>
        </div>
      </div>

      <div className="biz-types">
        {BIZ_TYPES.map((type) => <BizTypeSection key={type.id} type={type} />)}
      </div>
    </div>
  );
}

function BizTypeSection({ type }: { type: BizTypeConfig }) {
  const { bizAccounts, addBizAccount, deleteBizAccount } = useAppStore();
  const [adding, setAdding] = useState(false);
  const accounts = bizAccounts.filter((b) => b.type === type.id);
  const Icon = type.icon;

  const handleCreate = (name: string, field: string) => {
    const biz: BizAccount = {
      id: String(Date.now()),
      type: type.id,
      name,
      status: 'active',
      socialAccounts: [],
      createdAt: new Date().toISOString(),
      ...(type.id === 'cortes' ? { postSchedule: field } : { niche: field }),
    };
    addBizAccount(biz);
    setAdding(false);
  };

  return (
    <section className="biz-type-section">
      <div className="biz-type-header" style={{ '--biz-color': type.color } as React.CSSProperties}>
        <div className="biz-type-icon" style={{ background: `${type.color}1f`, color: type.color }}><Icon size={20} /></div>
        <div className="biz-type-info">
          <h2>{type.name}</h2>
          <p>{type.desc}</p>
        </div>
        <button className="btn-primary biz-type-add" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} /> Cadastrar
        </button>
      </div>

      {adding && <NewBizForm type={type} onCreate={handleCreate} onCancel={() => setAdding(false)} />}

      {accounts.length === 0 ? (
        <div className="empty-state biz-empty"><p>Nenhum negócio cadastrado em {type.name} ainda.</p></div>
      ) : (
        <div className="biz-account-grid">
          {accounts.map((biz) => (
            <BizAccountCard key={biz.id} biz={biz} color={type.color} fieldLabel={type.fieldLabel} onDelete={() => deleteBizAccount(biz.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function NewBizForm({ type, onCreate, onCancel }: { type: BizTypeConfig; onCreate: (name: string, field: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [field, setField] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), field.trim());
    setName(''); setField('');
  };

  return (
    <div className="biz-new-form">
      <div className="form-group">
        <label>Nome do negócio</label>
        <input type="text" placeholder="Ex: Canal Cortes Podcast" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>{type.fieldLabel}</label>
        <input type="text" placeholder={type.fieldPlaceholder} value={field} onChange={(e) => setField(e.target.value)} />
      </div>
      <div className="biz-new-form-actions">
        <button className="btn-primary" onClick={submit}>Salvar</button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function BizAccountCard({ biz, color, fieldLabel, onDelete }: { biz: BizAccount; color: string; fieldLabel: string; onDelete: () => void }) {
  const { addSocialAccount, removeSocialAccount, updateBizAccount } = useAppStore();
  const [addingSocial, setAddingSocial] = useState(false);
  const [platform, setPlatform] = useState<SocialAccount['platform']>('instagram');
  const [handle, setHandle] = useState('');

  const submitSocial = () => {
    if (!handle.trim()) return;
    addSocialAccount(biz.id, { id: String(Date.now()), platform, handle: handle.trim() });
    setHandle(''); setAddingSocial(false);
  };

  return (
    <div className="biz-account-card" style={{ '--biz-color': color } as React.CSSProperties}>
      <div className="biz-account-header">
        <span className="biz-account-name">{biz.name}</span>
        <button
          className={`status-pill ${biz.status === 'active' ? 'connected' : 'disconnected'} biz-status-toggle`}
          onClick={() => updateBizAccount(biz.id, { status: biz.status === 'active' ? 'paused' : 'active' })}
        >
          {biz.status === 'active' ? 'Ativo' : 'Pausado'}
        </button>
      </div>
      {(biz.niche || biz.postSchedule) && (
        <p className="biz-account-field"><span>{fieldLabel}:</span> {biz.niche || biz.postSchedule}</p>
      )}

      <div className="biz-social-chips">
        {biz.socialAccounts.map((sa) => (
          <span key={sa.id} className="biz-social-chip">
            {SOCIAL_PLATFORMS.find((p) => p.id === sa.platform)?.label ?? sa.platform}: {sa.handle}
            <button onClick={() => removeSocialAccount(biz.id, sa.id)}><X size={11} /></button>
          </span>
        ))}
      </div>

      {addingSocial ? (
        <div className="biz-social-form">
          <select value={platform} onChange={(e) => setPlatform(e.target.value as SocialAccount['platform'])}>
            {SOCIAL_PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input type="text" placeholder="@usuario" value={handle} onChange={(e) => setHandle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitSocial()} />
          <button className="btn-icon-sm" onClick={submitSocial}><Plus size={14} /></button>
        </div>
      ) : (
        <button className="biz-add-social-btn" onClick={() => setAddingSocial(true)}><Plus size={12} /> Rede social</button>
      )}

      <button className="biz-delete-btn" onClick={onDelete}>Remover negócio</button>
    </div>
  );
}

// ============================================================
// SETTINGS — Organizado por Grupos
// ============================================================

type SettingsPage = 'perfil' | 'seguranca' | 'providers' | 'modelos' | 'plugins' | 'integrations' | 'mcp' | 'storage' | 'memoria' | 'database' | 'logs' | 'tema' | 'idioma' | 'notificacoes' | 'atalhos';

const SETTINGS_GROUPS = [
  { label: 'Conta', items: [
    { id: 'perfil' as SettingsPage, label: 'Perfil', icon: Users },
    { id: 'seguranca' as SettingsPage, label: 'Segurança', icon: Shield },
  ]},
  { label: 'Sistema', items: [
    { id: 'providers' as SettingsPage, label: 'Providers', icon: Cpu },
    { id: 'modelos' as SettingsPage, label: 'Modelos', icon: Bot },
    { id: 'mcp' as SettingsPage, label: 'MCP Servers', icon: Network },
    { id: 'plugins' as SettingsPage, label: 'Plugins', icon: Layers },
    { id: 'integrations' as SettingsPage, label: 'Integrações', icon: Globe },
  ]},
  { label: 'Dados', items: [
    { id: 'storage' as SettingsPage, label: 'Storage', icon: HardDrive },
    { id: 'memoria' as SettingsPage, label: 'Memória', icon: Database },
    { id: 'database' as SettingsPage, label: 'Banco', icon: Database },
    { id: 'logs' as SettingsPage, label: 'Logs', icon: Terminal },
  ]},
  { label: 'Personalização', items: [
    { id: 'tema' as SettingsPage, label: 'Tema', icon: Palette },
    { id: 'idioma' as SettingsPage, label: 'Idioma', icon: Globe },
    { id: 'notificacoes' as SettingsPage, label: 'Notificações', icon: Bell },
    { id: 'atalhos' as SettingsPage, label: 'Atalhos', icon: Key },
  ]},
];

function SettingsView() {
  const [page, setPage] = useState<SettingsPage>('perfil');

  return (
    <div className="settings">
      <div className="settings-sidebar">
        <h2>Settings</h2>
        <nav>
          {SETTINGS_GROUPS.map((g) => (
            <div key={g.label} className="settings-group">
              <span className="settings-group-label">{g.label}</span>
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={`settings-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
      <div className="settings-content">
        {page === 'perfil' && (
          <div className="settings-page">
            <h2>Perfil</h2>
            <p className="settings-desc">Suas informações pessoais</p>
            <div className="form-group"><label>Nome</label><input type="text" placeholder="Seu nome" defaultValue="Gabriel T." /></div>
            <div className="form-group"><label>Email</label><input type="email" placeholder="seu@email.com" defaultValue="gabriel@beehive.ai" /></div>
            <div className="form-group"><label>Bio</label><textarea rows={3} placeholder="Conte-nos sobre você..." defaultValue="Desenvolvedor e criador do BeeHive OS" /></div>
            <button className="btn-primary">Salvar</button>
          </div>
        )}
        {page === 'providers' && (
          <div className="settings-page">
            <h2>Providers</h2>
            <p className="settings-desc">Provedores de IA conectados</p>
            {[
              { name: 'OpenRouter', status: 'connected', desc: 'Múltiplos modelos' },
              { name: 'OpenAI', status: 'disconnected', desc: 'GPT-4, DALL-E' },
              { name: 'Anthropic', status: 'disconnected', desc: 'Claude 3.5' },
            ].map((p) => (
              <div key={p.name} className="provider-card">
                <div className="provider-header">
                  <span className="provider-name">{p.name}</span>
                  <span className={`status-pill ${p.status}`}>{p.status === 'connected' ? 'Conectado' : 'Desconectado'}</span>
                </div>
                <p>{p.desc}</p>
                <div className="form-group"><label>API Key</label><input type="password" placeholder="sk-..." /></div>
              </div>
            ))}
          </div>
        )}
        {page === 'mcp' && (
          <div className="settings-page">
            <h2>MCP Servers</h2>
            <p className="settings-desc">Model Context Protocol servers for extended tool capabilities</p>
            <McpSettingsPanel />
          </div>
        )}
        {page === 'tema' && (
          <div className="settings-page">
            <h2>Tema</h2>
            <p className="settings-desc">Personalize a aparência</p>
            <div className="form-group">
              <label>Tema</label>
              <div className="theme-grid">
                <button className="theme-card active">🌙 Dark</button>
                <button className="theme-card">☀️ Light</button>
                <button className="theme-card">💻 System</button>
              </div>
            </div>
          </div>
        )}
        {page === 'logs' && (
          <div className="settings-page">
            <h2>Logs</h2>
            <p className="settings-desc">Histórico de atividades do sistema</p>
            <div className="logs-viewer">
              {['[09:00] System boot', '[09:01] Kernel initialized', '[09:01] 3 plugins loaded', '[09:02] OpenRouter connected', '[09:03] Browser plugin ready'].map((l, i) => (
                <div key={i} className="log-line"><code>{l}</code></div>
              ))}
            </div>
          </div>
        )}
        {!['perfil', 'providers', 'tema', 'logs'].includes(page) && (
          <div className="settings-page">
            <h2>{SETTINGS_GROUPS.flatMap((g) => g.items).find((i) => i.id === page)?.label}</h2>
            <p className="settings-desc">Em desenvolvimento</p>
          </div>
        )}
      </div>
    </div>
  );
}