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
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive } from './services/beehiveApi';
import type { Project, Agent, Workflow as WorkflowType, Artifact, BizAccount, BizType, SocialAccount } from './types';
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
  const [projectView, setProjectView] = useState<'chat' | 'agents' | 'workflows' | 'artifacts' | 'settings'>('chat');
  const [rightPanel, setRightPanel] = useState<'artifacts' | 'pipeline' | 'logs' | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);

  const openProject = (project: Project) => {
    setOpenedProject(project);
    setProjectView('chat');
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

        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className={`nav-row${activeArea === 'chat' ? ' active' : ''}`}>
              <button className="nav-row-main" onClick={() => setActiveArea('chat')}>
                <MessageSquare size={17} strokeWidth={1.6} />
                <span>Chat</span>
              </button>
              <button className="nav-row-plus" title="Nova conversa" onClick={handleNewConversation}>
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>

            <div className={`nav-row${activeArea === 'projetos' ? ' active' : ''}`} onClick={goToProjectsList}>
              <button className="nav-row-main nav-row-single">
                <FolderKanban size={17} strokeWidth={1.6} />
                <span>Projetos</span>
              </button>
            </div>

            <div className={`nav-row${activeArea === 'negocios' ? ' active' : ''}`} onClick={() => setActiveArea('negocios')}>
              <button className="nav-row-main nav-row-single">
                <Package size={17} strokeWidth={1.6} />
                <span>Negócios</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-recent">
          <div className="sidebar-section-label"><span>Recentes</span></div>
          <div className="recent-list">
            {projects.slice(0, 6).map((p) => (
              <button key={p.id} className="recent-row" onClick={() => openProject(p)}>
                <span className="recent-icon">{p.icon}</span>
                <span className="recent-name">{p.name}</span>
                <span className={`recent-dot ${p.status}`} />
              </button>
            ))}
            {projects.length === 0 && (
              <div className="recent-empty">Nenhum projeto ainda</div>
            )}
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
          {activeArea === 'chat' && <HomeChat key={chatResetKey} />}
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
    const reply = await askBeeHive(value);
    setMessages((prev) => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: reply, time: now() }]);
    setSending(false);
  };

  return (
    <div className="home-chat-layout">
      <main className="chat-main">
        {!started ? (
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
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                <div className="msg-avatar">{m.role === 'user' ? <Users size={16} /> : <Bot size={16} />}</div>
                <div className="msg-body">
                  <div className="msg-header">
                    <span className="msg-role">{m.role === 'user' ? 'Você' : 'BeeHive'}</span>
                    <span className="msg-time">{m.time}</span>
                  </div>
                  <div className="msg-content">{m.content}</div>
                </div>
              </div>
            ))}
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

// Chat Input Area - textarea grande, modelo + reasoning abaixo à esquerda
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

  const models = [
    { id: 'opencode:big-pickle', name: 'opencode:big-pickle', provider: 'OpenCode', supportsImages: false },
    { id: 'openrouter:gpt-4o', name: 'GPT-4o', provider: 'OpenRouter', supportsImages: true },
    { id: 'openrouter:claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'OpenRouter', supportsImages: true },
    { id: 'openrouter:gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'OpenRouter', supportsImages: true },
    { id: 'ollama:llama3', name: 'Llama 3', provider: 'Ollama', supportsImages: false },
    { id: 'ollama:mistral', name: 'Mistral', provider: 'Ollama', supportsImages: false },
  ];

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
          <span>O modelo <strong>{currentModel?.name}</strong> não suporta imagens. As {imageFiles.length} imagem(ns) serão ignoradas. Troque para GPT-4o, Claude ou Gemini para usar imagens.</span>
        </div>
      )}
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
          <button className="chat-send-btn" onClick={handleSend} disabled={sending || (!input.trim() && attachedFiles.length === 0)}>
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
                {models.map(m => (
                  <button key={m.id} className={`dropdown-item${selectedModel === m.id ? ' active' : ''}`} onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}>
                    <span className="dropdown-item-name">{m.name}</span>
                    <span className="dropdown-item-provider">{m.provider}</span>
                  </button>
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
  activeView: 'chat' | 'agents' | 'workflows' | 'artifacts' | 'settings';
  onViewChange: (v: 'chat' | 'agents' | 'workflows' | 'artifacts' | 'settings') => void;
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
          <button className={`tab${activeView === 'chat' ? ' active' : ''}`} onClick={() => onViewChange('chat')}>
            <MessageSquare size={14} /> Chat
          </button>
          <button className={`tab${activeView === 'agents' ? ' active' : ''}`} onClick={() => onViewChange('agents')}>
            <Bot size={14} /> Agentes
            <span className="tab-badge">{project.agents.length}</span>
          </button>
          <button className={`tab${activeView === 'workflows' ? ' active' : ''}`} onClick={() => onViewChange('workflows')}>
            <Workflow size={14} /> Workflows
            <span className="tab-badge">{project.workflows.length}</span>
          </button>
          <button className={`tab${activeView === 'artifacts' ? ' active' : ''}`} onClick={() => onViewChange('artifacts')}>
            <Layers size={14} /> Artifacts
            <span className="tab-badge">{project.artifacts.length}</span>
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
          {activeView === 'chat' && <ProjectChat project={project} />}
          {activeView === 'agents' && <ProjectAgents project={project} />}
          {activeView === 'workflows' && <ProjectWorkflows project={project} />}
          {activeView === 'artifacts' && <ProjectArtifacts project={project} />}
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
                <span className="artifact-card-meta">{a.type} · {a.size}</span>
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
          {['[10:30] Mission started', '[10:31] Agent response generated', '[10:32] Pipeline step completed', '[10:33] Artifact saved', '[10:34] Memory updated'].map((l, i) => (
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

type SettingsPage = 'perfil' | 'seguranca' | 'providers' | 'modelos' | 'plugins' | 'integrations' | 'storage' | 'memoria' | 'database' | 'logs' | 'tema' | 'idioma' | 'notificacoes' | 'atalhos';

const SETTINGS_GROUPS = [
  { label: 'Conta', items: [
    { id: 'perfil' as SettingsPage, label: 'Perfil', icon: Users },
    { id: 'seguranca' as SettingsPage, label: 'Segurança', icon: Shield },
  ]},
  { label: 'Sistema', items: [
    { id: 'providers' as SettingsPage, label: 'Providers', icon: Cpu },
    { id: 'modelos' as SettingsPage, label: 'Modelos', icon: Bot },
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