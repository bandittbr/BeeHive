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
  Edit2,
  FileText as FileTextIcon,
  Save,
  AlertCircle,
  CheckCircle,
  Play,
  ChevronLeft,
  Calendar as CalendarIcon,
  Key as KeyIcon,
  Menu,
  Shuffle,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import { askBeeHive, askBeeHiveStream } from './services/beehiveApi';
import { planTask, runStep, type Plan, type PlanStep } from './services/orchestrator';
import { generateContentPackage } from './services/contentPipeline';
import { generateCortes, type CorteClip } from './services/cortesPipeline';
import { TaskPlan } from './components/chat/TaskPlan';
import { useConversations, useMessages } from './hooks/useConversations';
import { createExecutionService, UnifiedExecutionService, ExecutionConfig, ExecutionResult } from './services/execution.service';
import { MessageList } from './components/chat/MessageList';

import { PipelineBuilder } from './components/pipeline/PipelineBuilder';
import { CostDashboard } from './components/cost/CostDashboard';
import { EvaluationRunner } from './components/evaluation/EvaluationRunner';
import { ModelSelect } from './components/chat/ModelSelector';
import { ReasoningEffortSelect } from './components/chat/ReasoningEffortSelect';
import { Composer } from './components/chat/Composer';
import { McpSettingsPanel } from './components/chat/McpSettingsPanel';
import { SettingsShell, type SettingsTab } from './components/settings/settings-shell';
import { SettingsContent, SettingsPanel, SettingsPanelHeading, SettingsPanelTitle, SettingsPanelDescription } from './components/settings/panel';
import { AiSettingsView } from './components/settings/ai-view';
import { AppearanceView } from './components/settings/appearance-view';
import { PreferencesView } from './components/settings/preferences-view';
import { EnvironmentView } from './components/settings/environment-view';
import { ExtensionsView } from './components/settings/extensions-view';
import { ProviderIcon } from './components/settings/provider-icon';
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
  const [projectView, setProjectView] = useState<'cowork' | 'agents' | 'workflows' | 'pipelines' | 'artifacts' | 'settings' | 'scheduler' | 'secrets' | 'costs'>('cowork');
  const [rightPanel, setRightPanel] = useState<'artifacts' | 'pipeline' | 'logs' | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className={`app${sidebarOpen ? ' sidebar-open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget && sidebarOpen) setSidebarOpen(false); }}>
      {/* Sidebar rotulada */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><img src="/logo.png" alt="BeeHive" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /></div>
          <span className="logo-text">BeeHive</span>
        </div>
        <div className="sidebar-nav">
          <div className="nav-group">
            <div className={`nav-row${activeArea === 'chat' ? ' active' : ''}`}>
              <button className="nav-row-main" onClick={() => { setActiveArea('chat'); setOpenedProject(null); setSidebarOpen(false); }}><MessageSquare size={16} /> Chat</button>
              <button className="nav-row-plus" onClick={() => { handleNewConversation(); setSidebarOpen(false); }} title="Nova conversa"><Plus size={14} /></button>
            </div>
            <div className={`nav-row${activeArea === 'projetos' ? ' active' : ''}`}>
              <button className="nav-row-main" onClick={() => { setActiveArea('projetos'); setOpenedProject(null); setSidebarOpen(false); }}><FolderKanban size={16} /> Projetos</button>
              <button className="nav-row-plus" onClick={() => { handleNewProject(); setSidebarOpen(false); }} title="Novo projeto"><Plus size={14} /></button>
            </div>
            <div className={`nav-row${activeArea === 'negocios' ? ' active' : ''}`}>
              <button className="nav-row-main" onClick={() => { setActiveArea('negocios'); setOpenedProject(null); setSidebarOpen(false); }}><Globe size={16} /> Negócios</button>
            </div>
            <div className={`nav-row${activeArea === 'evaluations' ? ' active' : ''}`}>
              <button className="nav-row-main" onClick={() => { setActiveArea('evaluations'); setOpenedProject(null); setSidebarOpen(false); }}><BarChart3 size={16} /> Avaliações</button>
            </div>
          </div>
          <div className="sidebar-divider" />
          <div className="sidebar-recent" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <div className="sidebar-section-label">Projetos Recentes</div>
            <div className="recent-list">
              {projects.slice(0, 5).map((p: Project) => (
                <button key={p.id} className="recent-row" onClick={() => { openProject(p); setSidebarOpen(false); }}>
                  <span className="recent-icon">{p.icon}</span>
                  <span className="recent-name">{p.name}</span>
                  <span className={`recent-dot ${p.status}`} />
                </button>
              ))}
              {projects.length === 0 && <div className="recent-empty">Nenhum projeto ainda</div>}
            </div>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="nav-group">
            <div className={`nav-row${activeArea === 'settings' ? ' active' : ''}`}>
              <button className="nav-row-main" onClick={() => { setActiveArea('settings'); setOpenedProject(null); setSidebarOpen(false); }}><Settings size={16} /> Settings</button>
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
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)} title="Menu" aria-label="Abrir menu">
            <Menu size={18} />
          </button>
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
          {activeArea === 'evaluations' && (projects[0]
            ? <EvaluationRunner project={projects[0]} />
            : <div className="page-header"><div><h1>Avaliações</h1><p>Crie um projeto primeiro para rodar avaliações.</p></div></div>)}
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
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-v4-pro');
  const [omniRouterEnabled, setOmniRouterEnabled] = useState(() => localStorage.getItem('beehive-omnirouter') === '1');
  const [reasoningEffort, setReasoningEffort] = useState<'default' | 'low' | 'medium' | 'high'>('default');
  const [fileOperations, setFileOperations] = useState<{ id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[]>([]);
  const [showFilePanel, setShowFilePanel] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const { messages, loading: messagesLoading, sendMessage, setMessages } = useMessages(activeConversationId);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleNewConversation = async () => {
    if (!firstProjectId) return;
    const title = newConversationTitle || `Conversa ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const conversation = await createConversation(title, selectedModel, 'default');
    if (conversation) {
      setActiveConversationId(conversation.id);
      setStarted(true);
      setNewConversationTitle('');
    }
  };

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sending) return;

    // Persistência de conversa é opcional (backend pode não estar disponível);
    // nunca bloqueia o envio.
    if (!activeConversationId && firstProjectId) {
      try {
        const title = `Conversa ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        const conversation = await createConversation(title, selectedModel, 'default');
        if (conversation) setActiveConversationId(conversation.id);
      } catch { /* segue sem persistir */ }
    }

    setInput('');
    setAttachedFiles([]);
    setStarted(true);
    setPlan(null);

    const userContent = value;
    const userMsgId = String(Date.now());
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userContent, createdAt: new Date().toISOString() }]);
    setSending(true);

    // 1) O cérebro decide: conversa simples ou tarefa multi-etapa?
    const decided = await planTask(value);

    if (!decided.conversational && decided.steps.length > 0) {
      // Tarefa: mostra o plano e executa etapa por etapa (progresso ao vivo)
      await runPlan(decided);
      setSending(false);
      return;
    }

    // 2) Conversa simples → resposta com streaming (como antes)
    const assistantMsgId = String(Date.now() + 1);
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date().toISOString() }]);

    let fullContent = '';
    await askBeeHiveStream(value, (chunk) => {
      fullContent += chunk;
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: fullContent } : m
      ));
    }, { modelID: selectedModel, omnirouter: omniRouterEnabled });

    setMessages((prev) => prev.map((m) =>
      m.id === assistantMsgId ? { ...m, content: fullContent || 'Não consegui gerar uma resposta.' } : m
    ));
    setSending(false);
  };

  // Executa um plano etapa por etapa, atualizando o painel de progresso ao vivo.
  const runPlan = async (initial: Plan) => {
    let steps: PlanStep[] = initial.steps.map((s) => ({ ...s }));
    setPlan({ ...initial, steps });

    for (let i = 0; i < steps.length; i++) {
      steps = steps.map((s, idx) => (idx === i ? { ...s, status: 'running' } : s));
      setPlan({ ...initial, steps });

      const updated = await runStep(steps[i], { intent: initial.intent, previous: steps.slice(0, i) });
      steps = steps.map((s, idx) => (idx === i ? updated : s));
      setPlan({ ...initial, steps });
    }

    // Resumo final no chat
    const done = steps.filter((s) => s.status === 'done').length;
    const blocked = steps.filter((s) => s.status === 'blocked').length;
    const summary = `Plano concluído: ${done}/${steps.length} etapas executadas.` +
      (blocked > 0 ? ` ${blocked} etapa(s) aguardam o Cowork (execução real) — em construção.` : '');
    setMessages((prev) => [...prev, { id: String(Date.now() + 2), role: 'assistant', content: summary, createdAt: new Date().toISOString() }]);
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
                  <button key={a.label} className="quick-action" onClick={() => a.label === 'Nova conversa' ? handleNewConversation() : handleSend(a.label)}>
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
              messages={messages.filter(m => m.role !== 'system').map(m => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                time: new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                streaming: sending && m.id === messages[messages.length - 1]?.id,
              }))}
              streaming={sending}
            />
            {plan && !plan.conversational && <TaskPlan intent={plan.intent} steps={plan.steps} />}
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
          omniRouterEnabled={omniRouterEnabled}
          setOmniRouterEnabled={(v) => { setOmniRouterEnabled(v); localStorage.setItem('beehive-omnirouter', v ? '1' : '0'); }}
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

// Chat Input Area - campo único e funcional (estilo openwork/Claude): textarea + model picker + reasoning + anexos
function ChatInputArea({
  input,
  setInput,
  sending,
  handleSend,
  attachedFiles,
  setAttachedFiles,
  selectedModel,
  setSelectedModel,
  omniRouterEnabled,
  setOmniRouterEnabled,
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
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  omniRouterEnabled: boolean;
  setOmniRouterEnabled: (v: boolean) => void;
  reasoningEffort: 'default' | 'low' | 'medium' | 'high';
  setReasoningEffort: (v: 'default' | 'low' | 'medium' | 'high') => void;
  fileOperations: { id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[];
  setFileOperations: React.Dispatch<React.SetStateAction<{ id: string; name: string; type: 'created' | 'edited' | 'read'; content?: string }[]>>;
  showFilePanel: boolean;
  setShowFilePanel: (v: boolean) => void;
}) {
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Todos os modelos abaixo são roteados pelo worker via OpenRouter (uma chave
  // só dá acesso a esses e a dezenas de outros). O title é só o nome do
  // modelo — o provider (OpenRouter) já aparece na linha de baixo do item.
  const modelOptions = [
    { providerID: 'openrouter', modelID: 'deepseek/deepseek-v4-pro', title: 'DeepSeek V4 Pro', description: 'OpenRouter', supportsImages: false },
    { providerID: 'openrouter', modelID: 'meta-llama/llama-3.1-8b-instruct:free', title: 'Llama 3.1 8B (grátis)', description: 'OpenRouter', supportsImages: false },
    { providerID: 'openrouter', modelID: 'openai/gpt-4o', title: 'GPT-4o', description: 'OpenRouter', supportsImages: true },
    { providerID: 'openrouter', modelID: 'openai/gpt-4o-mini', title: 'GPT-4o Mini', description: 'OpenRouter', supportsImages: true },
    { providerID: 'openrouter', modelID: 'anthropic/claude-3.5-sonnet', title: 'Claude 3.5 Sonnet', description: 'OpenRouter', supportsImages: true },
    { providerID: 'openrouter', modelID: 'google/gemini-1.5-pro', title: 'Gemini 1.5 Pro', description: 'OpenRouter', supportsImages: true },
  ];

  const effortOptions = [
    { value: 'default', label: 'Padrão', desc: 'Balanceado' },
    { value: 'low', label: 'Low', desc: 'Rápido, menos tokens' },
    { value: 'medium', label: 'Medium', desc: 'Equilibrado' },
    { value: 'high', label: 'High', desc: 'Mais profundo, mais tokens' },
  ];

  const currentModel = modelOptions.find(m => m.modelID === selectedModel);
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

      {/* Single unified input bubble — texto em cima, controles embaixo (estilo openwork/Claude) */}
      <div className="input-bubble">
        {/* Linha 1: campo de texto ocupa toda a largura */}
        <div style={{ padding: '14px 18px 6px' }}>
          <textarea
            ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; } }}
            className="chat-input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte qualquer coisa... (Enter envia, Shift+Enter nova linha)"
            rows={1}
            disabled={sending}
            style={{
              width: '100%', resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font)',
              fontSize: '15px', lineHeight: '1.5', padding: '2px 0',
              maxHeight: '220px', minHeight: '24px', overflowY: 'auto',
            }}
          />
        </div>

        {/* Linha 2: anexar + modelo + raciocínio (esquerda) · enviar (direita) */}
        <div className="input-controls-row" style={{ justifyContent: 'space-between', paddingTop: '4px', background: 'transparent' }}>
          <div className="input-controls">
            {/* Anexar — só o ícone, sem borda */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo"
              aria-label="Anexar arquivo"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 8 }}
            >
              <FilePlus size={18} />
            </button>
            <input type="file" ref={fileInputRef} multiple onChange={e => e.target.files && handleFileAttach(e.target.files)} style={{ display: 'none' }} />

            <ModelSelect
              open={modelOpen}
              onOpenChange={setModelOpen}
              value={{ providerID: 'openrouter', modelID: selectedModel }}
              onChange={(modelRef) => setSelectedModel(modelRef.modelID)}
              options={modelOptions}
              placeholder="Select model"
            />

            <button
              type="button"
              onClick={() => setOmniRouterEnabled(!omniRouterEnabled)}
              title={omniRouterEnabled
                ? 'OmniRouter ativo — troca de modelo sozinho se este ficar sem crédito/limite'
                : 'Ativar OmniRouter (troca de modelo automática por esgotamento de cota)'}
              aria-pressed={omniRouterEnabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 8, fontSize: 13,
                border: omniRouterEnabled ? '1px solid var(--accent, #6d5efc)' : '1px solid transparent',
                background: omniRouterEnabled ? 'var(--accent-soft, rgba(109,94,252,0.12))' : 'transparent',
                color: omniRouterEnabled ? 'var(--accent, #6d5efc)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <Shuffle size={14} />
              OmniRouter
            </button>

            <ReasoningEffortSelect
              value={reasoningEffort}
              label="Raciocínio"
              options={effortOptions}
              onChange={(v) => v && setReasoningEffort(v as 'default' | 'low' | 'medium' | 'high')}
            />
          </div>

          {/* Enviar — no canto direito da linha de baixo */}
          <button className="chat-send-btn" onClick={handleSend} disabled={sending || (!input.trim() && attachedFiles.length === 0)} aria-label="Enviar">
            <Send size={18} />
          </button>
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
          {activeView === 'cowork' && <ProjectChat project={project} />}
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
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; time: string }[]>([]);

  const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleSend = async () => {
    const value = input.trim();
    if (!value || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { id: String(Date.now()), role: 'user', content: value, time: now() }]);
    setSending(true);

    const assistantMsgId = String(Date.now() + 1);
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', time: now() }]);

    // Contexto do projeto vai junto no prompt até o runtime real (opencode) existir
    const contextPrefix = `[Projeto: ${project.name}${project.description ? ` — ${project.description}` : ''}]\n\n`;
    let fullContent = '';
    await askBeeHiveStream(contextPrefix + value, (chunk) => {
      fullContent = chunk;
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullContent } : m)));
    });
    setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullContent || 'Não consegui gerar uma resposta.' } : m)));
    setSending(false);
  };

  return (
    <div className="project-chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-hero">
            <div className="chat-hero-icon"><Sparkles size={28} /></div>
            <h1>Cowork — {project.name}</h1>
            <p>Dê um prompt e o BeeHive trabalha no contexto deste projeto.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-avatar">{m.role === 'user' ? <Users size={16} /> : <Bot size={16} />}</div>
            <div className="msg-body">
              <div className="msg-header">
                <span className="msg-role">{m.role === 'user' ? 'Você' : project.name}</span>
                <span className="msg-time">{m.time}</span>
              </div>
              <div className="msg-content">{m.content || (sending ? '…' : '')}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input-area">
        <div className="input-bubble">
          {/* Linha 1: texto */}
          <div style={{ padding: '14px 18px 6px' }}>
            <textarea
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 180) + 'px'; } }}
              className="chat-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 180) + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sending && input.trim()) handleSend(); } }}
              placeholder={`Enviar para ${project.name}... (Enter envia)`}
              rows={1}
              disabled={sending}
              style={{
                width: '100%', resize: 'none', border: 'none', outline: 'none',
                background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font)',
                fontSize: '15px', lineHeight: '1.5', padding: '2px 0',
                maxHeight: '180px', minHeight: '24px', overflowY: 'auto',
              }}
            />
          </div>
          {/* Linha 2: enviar no canto direito */}
          <div className="input-controls-row" style={{ justifyContent: 'flex-end', paddingTop: '4px', background: 'transparent' }}>
            <button className="chat-send-btn" onClick={handleSend} disabled={sending || !input.trim()} aria-label="Enviar">
              <Send size={18} />
            </button>
          </div>
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

  const handleCreate = (data: { name: string; field: string; description: string; postsPerDay: number }) => {
    const biz: BizAccount = {
      id: String(Date.now()),
      type: type.id,
      name: data.name,
      status: 'active',
      socialAccounts: [],
      createdAt: new Date().toISOString(),
      description: data.description || undefined,
      postsPerDay: data.postsPerDay,
      content: [],
      ...(type.id === 'cortes' ? { postSchedule: data.field } : { niche: data.field }),
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

function NewBizForm({ type, onCreate, onCancel }: { type: BizTypeConfig; onCreate: (data: { name: string; field: string; description: string; postsPerDay: number }) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [field, setField] = useState('');
  const [description, setDescription] = useState('');
  const [postsPerDay, setPostsPerDay] = useState(1);

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), field: field.trim(), description: description.trim(), postsPerDay });
    setName(''); setField(''); setDescription(''); setPostsPerDay(1);
  };

  return (
    <div className="biz-new-form">
      <div className="form-group">
        <label>Nome do negócio</label>
        <input type="text" placeholder="Ex: Chris Cortes Comédia" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>{type.fieldLabel}</label>
        <input type="text" placeholder={type.fieldPlaceholder} value={field} onChange={(e) => setField(e.target.value)} />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label>Descrição / diretrizes de conteúdo</label>
        <textarea rows={2} placeholder="Ex: histórias de terror curtas, tom sombrio, para público jovem..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Postagens por dia</label>
        <input type="number" min={1} max={20} value={postsPerDay} onChange={(e) => setPostsPerDay(Math.max(1, Number(e.target.value) || 1))} />
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
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Cortes
  const [cortesUrl, setCortesUrl] = useState('');
  const [cortesBusy, setCortesBusy] = useState(false);
  const [cortesMsg, setCortesMsg] = useState('');
  const [cortesErr, setCortesErr] = useState('');
  const [cortesClips, setCortesClips] = useState<CorteClip[]>([]);

  const runCortes = async () => {
    if (cortesBusy || !cortesUrl.trim()) return;
    setCortesBusy(true); setCortesErr(''); setCortesClips([]); setCortesMsg('Iniciando...');
    try {
      const res = await generateCortes({ url: cortesUrl.trim(), count: 3, onProgress: setCortesMsg });
      if (res.error) setCortesErr(res.error);
      setCortesClips(res.clips);
    } finally {
      setCortesBusy(false); setCortesMsg('');
    }
  };

  const submitSocial = () => {
    if (!handle.trim()) return;
    addSocialAccount(biz.id, { id: String(Date.now()), platform, handle: handle.trim() });
    setHandle(''); setAddingSocial(false);
  };

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const pkg = await generateContentPackage({
        type: biz.type,
        niche: biz.niche || biz.postSchedule || biz.name,
        description: biz.description,
      });
      updateBizAccount(biz.id, { content: [pkg, ...(biz.content || [])] });
      setExpanded(pkg.id);
    } finally {
      setGenerating(false);
    }
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

      {/* Cortes: baixar vídeo grande → cortar em vertical */}
      {biz.type === 'cortes' && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gerar cortes de um vídeo</span>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              type="text"
              value={cortesUrl}
              onChange={(e) => setCortesUrl(e.target.value)}
              placeholder="Cole o link do vídeo (YouTube...)"
              style={{ flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '6px 8px', outline: 'none' }}
            />
            <button
              onClick={runCortes}
              disabled={cortesBusy || !cortesUrl.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: cortesBusy ? 'default' : 'pointer', color: 'white', background: color, opacity: cortesBusy || !cortesUrl.trim() ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              {cortesBusy ? <Loader2 size={12} className="spin" /> : <Scissors size={12} />}
              {cortesBusy ? 'Cortando...' : 'Gerar cortes'}
            </button>
          </div>
          {cortesMsg && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{cortesMsg}</p>}
          {cortesErr && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6 }}>{cortesErr}</p>}
          {cortesClips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {cortesClips.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', textDecoration: 'none' }}>
                  <Video size={14} style={{ color: color }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || `Corte ${i + 1}`}</span>
                  <Download size={13} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo gerado */}
      <div style={{ marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conteúdo {biz.postsPerDay ? `· ${biz.postsPerDay}/dia` : ''}
          </span>
          <button
            onClick={generate}
            disabled={generating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: generating ? 'default' : 'pointer', color: 'white', background: color, opacity: generating ? 0.6 : 1 }}
          >
            {generating ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
            {generating ? 'Gerando...' : 'Gerar conteúdo'}
          </button>
        </div>

        {(!biz.content || biz.content.length === 0) ? (
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Nenhum conteúdo gerado ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {biz.content.map((c) => (
              <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || c.idea || 'Conteúdo'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{expanded === c.id ? '▲' : '▼'}</span>
                </div>
                {expanded === c.id && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {c.idea && <div><strong style={{ color: 'var(--text)' }}>Ideia:</strong> {c.idea}</div>}
                    {c.script && <div><strong style={{ color: 'var(--text)' }}>Roteiro:</strong><div style={{ whiteSpace: 'pre-wrap', marginTop: 2 }}>{c.script}</div></div>}
                    {c.description && <div><strong style={{ color: 'var(--text)' }}>Descrição:</strong> {c.description}</div>}
                    {c.hashtags.length > 0 && <div style={{ color: 'var(--primary-light)' }}>{c.hashtags.map((h) => `#${h}`).join(' ')}</div>}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.status}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>postagem automática — em construção</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="biz-delete-btn" onClick={onDelete}>Remover negócio</button>
    </div>
  );
}

// ============================================================
// SETTINGS — Organizado por Grupos
// ============================================================

function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showSettings, setShowSettings] = useState(true);

  if (!showSettings) return null;

  return (
    <SettingsShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onClose={() => setShowSettings(false)}
    />
  );
}
