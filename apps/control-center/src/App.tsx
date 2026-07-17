import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, MessageSquare, FolderKanban, Settings, Bot, Workflow,
  Zap, Brain, Code, BarChart3, FileText, Image, Video, Music,
  Globe, Package, Layers, GitBranch, Clock, Users, Sparkles,
  Terminal, Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, CheckCircle2, AlertTriangle, XCircle, Send, Paperclip,
  Star, Download, ChevronRight, ArrowUpRight, CircleDot, Loader2,
  Target, Rocket, Eye, TrendingUp, DollarSign, Activity, Search,
  Plus, Minus, MoreHorizontal, ChevronDown, BrainCircuit, Network,
} from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { chatService } from './services/chat.service';
import { projectService } from './services/project.service';
import './App.css';

// ============================================================
// TYPES
// ============================================================

type View = 'home' | 'project';

interface Project {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  agents: Agent[];
  workflows: WorkflowItem[];
  artifacts: Artifact[];
}

interface Agent {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'working' | 'waiting' | 'error';
  task: string;
  color: string;
  pipeline?: PipelineStep[];
}

interface PipelineStep {
  id: string;
  label: string;
  type: 'agent' | 'provider' | 'tool' | 'artifact';
  status: 'pending' | 'active' | 'done' | 'error';
}

interface WorkflowItem {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'scheduled';
  progress: number;
  project: string;
}

interface Artifact {
  id: string;
  name: string;
  type: string;
  size: string;
  project: string;
}

interface Mission {
  id: string;
  name: string;
  progress: number;
  status: 'running' | 'completed' | 'error' | 'scheduled';
  agents: string[];
  project: string;
}

interface Event {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
  time: string;
  project: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const PROJECTS: Project[] = [
  {
    id: '1', name: 'BeeHive', icon: '­ƒÉØ', description: 'Plataforma de IA modular', status: 'active',
    agents: [
      { id: 'a1', name: 'Marketing Agent', status: 'working', task: 'Criando campanha para Instagram', color: '#a855f7',
        pipeline: [
          { id: 'p1', label: 'Thinking', type: 'agent', status: 'done' },
          { id: 'p2', label: 'Research', type: 'agent', status: 'done' },
          { id: 'p3', label: 'Browser', type: 'tool', status: 'done' },
          { id: 'p4', label: 'Claude Sonnet', type: 'provider', status: 'active' },
          { id: 'p5', label: 'Image Gen', type: 'tool', status: 'pending' },
          { id: 'p6', label: 'Artifact', type: 'artifact', status: 'pending' },
        ]
      },
      { id: 'a2', name: 'Research Agent', status: 'running', task: 'Analisando concorrentes', color: '#3b82f6' },
      { id: 'a3', name: 'Browser Agent', status: 'idle', task: 'Ocioso', color: '#10b981' },
    ],
    workflows: [
      { id: 'w1', name: 'Deploy Pipeline', status: 'running', progress: 64, project: 'BeeHive' },
      { id: 'w2', name: 'Code Review', status: 'completed', progress: 100, project: 'BeeHive' },
    ],
    artifacts: [
      { id: 'ar1', name: 'architecture-v1.png', type: 'Image', size: '2.4 MB', project: 'BeeHive' },
      { id: 'ar2', name: 'deploy-config.yaml', type: 'Code', size: '1.2 KB', project: 'BeeHive' },
    ],
  },
  {
    id: '2', name: 'TradeAI', icon: '­ƒôê', description: 'Trading automatizado', status: 'active',
    agents: [
      { id: 'b1', name: 'Trade Agent', status: 'working', task: 'Monitorando BTC/USDT', color: '#f59e0b',
        pipeline: [
          { id: 'q1', label: 'Thinking', type: 'agent', status: 'done' },
          { id: 'q2', label: 'Market Data', type: 'tool', status: 'done' },
          { id: 'q3', label: 'GPT-4o', type: 'provider', status: 'active' },
          { id: 'q4', label: 'Signal', type: 'artifact', status: 'pending' },
        ]
      },
      { id: 'b2', name: 'Risk Agent', status: 'idle', task: 'Ocioso', color: '#ef4444' },
    ],
    workflows: [
      { id: 'x1', name: 'Trade BTC', status: 'error', progress: 45, project: 'TradeAI' },
      { id: 'x2', name: 'Market Scan', status: 'running', progress: 78, project: 'TradeAI' },
    ],
    artifacts: [
      { id: 'y1', name: 'trade-signal.json', type: 'JSON', size: '0.8 KB', project: 'TradeAI' },
    ],
  },
  {
    id: '3', name: 'Marketing', icon: '­ƒôó', description: 'Campanhas e conte├║do', status: 'active',
    agents: [
      { id: 'c1', name: 'Content Agent', status: 'working', task: 'Gerando posts para Instagram', color: '#ec4899' },
      { id: 'c2', name: 'SEO Agent', status: 'running', task: 'Otimizando artigos', color: '#14b8a6' },
      { id: 'c3', name: 'Video Agent', status: 'waiting', task: 'Na fila de renderiza├º├úo', color: '#8b5cf6' },
      { id: 'c4', name: 'Analytics Agent', status: 'idle', task: 'Ocioso', color: '#6366f1' },
    ],
    workflows: [
      { id: 'z1', name: 'Marketing Di├írio', status: 'running', progress: 64, project: 'Marketing' },
      { id: 'z2', name: 'Publica├º├úo Instagram', status: 'scheduled', progress: 0, project: 'Marketing' },
      { id: 'z3', name: 'Pesquisa Empresa X', status: 'running', progress: 38, project: 'Marketing' },
    ],
    artifacts: [
      { id: 'w1', name: 'post-campanha.png', type: 'Image', size: '156 KB', project: 'Marketing' },
      { id: 'w2', name: 'relatorio-q4.pdf', type: 'PDF', size: '2.4 MB', project: 'Marketing' },
      { id: 'w3', name: 'video-final.mp4', type: 'Video', size: '48 MB', project: 'Marketing' },
    ],
  },
  {
    id: '4', name: 'Cliente X', icon: '­ƒÆ╝', description: 'Consultoria', status: 'paused',
    agents: [
      { id: 'd1', name: 'Consulting Agent', status: 'idle', task: 'Projeto pausado', color: '#64748b' },
    ],
    workflows: [],
    artifacts: [],
  },
];

const ALL_MISSIONS: Mission[] = [
  { id: 'm1', name: 'Marketing Di├írio', progress: 64, status: 'running', agents: ['Marketing Agent', 'Content Agent'], project: 'Marketing' },
  { id: 'm2', name: 'Pesquisa Empresa X', progress: 38, status: 'running', agents: ['Research Agent'], project: 'Marketing' },
  { id: 'm3', name: 'Publica├º├úo YouTube', progress: 100, status: 'completed', agents: ['Video Agent'], project: 'Marketing' },
  { id: 'm4', name: 'Deploy Pipeline', progress: 64, status: 'running', agents: ['Browser Agent'], project: 'BeeHive' },
  { id: 'm5', name: 'Trade BTC', progress: 45, status: 'error', agents: ['Trade Agent'], project: 'TradeAI' },
  { id: 'm6', name: 'Market Scan', progress: 78, status: 'running', agents: ['Trade Agent'], project: 'TradeAI' },
];

const ALL_EVENTS: Event[] = [
  { id: 'e1', type: 'success', text: 'Publica├º├úo YouTube conclu├¡da', time: '2 min', project: 'Marketing' },
  { id: 'e2', type: 'success', text: 'Workflow "Marketing Di├írio" atualizado', time: '15 min', project: 'Marketing' },
  { id: 'e3', type: 'warning', text: 'OpenRouter com lat├¬ncia alta', time: '30 min', project: 'BeeHive' },
  { id: 'e4', type: 'success', text: 'Browser scraping finalizado', time: '1h', project: 'BeeHive' },
  { id: 'e5', type: 'error', text: 'Trade BTC ÔÇö conex├úo perdida', time: '2h', project: 'TradeAI' },
  { id: 'e6', type: 'success', text: 'Screenshot criada', time: '3h', project: 'BeeHive' },
];

// ============================================================
// APP
// ============================================================

export default function App() {
  const navigate = useNavigate();
  const { projects: storeProjects, setCurrentProject, addProject } = useAppStore();
  const [view, setView] = useState<View>('home');
  const [selectedProject, setSelectedProject] = useState<Project>(PROJECTS[0]);
  const [projectView, setProjectView] = useState<'chat' | 'agents' | 'workflows' | 'artifacts' | 'settings'>('chat');
  const [rightPanel, setRightPanel] = useState<'artifacts' | 'pipeline' | 'logs' | null>(null);

  const openProject = (project: Project) => {
    setSelectedProject(project);
    setCurrentProject(storeProjects.find(p => p.id === project.id) || null);
    setView('project');
    setProjectView('chat');
  };

  const handleNewProject = async () => {
    const name = prompt('Nome do novo projeto:');
    if (name) {
      const icons = ['📁', '🚀', '💡', '🎯', '🔥'];
      const icon = icons[Math.floor(Math.random() * icons.length)];
      await projectService.create({ name, icon, description: '', status: 'active' });
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><Sparkles size={18} /></div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item${view === 'home' ? ' active' : ''}`} onClick={() => setView('home')} title="Mission Control">
            <Home size={18} strokeWidth={1.5} />
          </button>
          <div className="sidebar-divider" />
          {PROJECTS.map(p => (
            <button key={p.id} className={`nav-item project-nav${view === 'project' && selectedProject.id === p.id ? ' active' : ''}`} onClick={() => openProject(p)} title={p.name}>
              <span className="project-nav-icon">{p.icon}</span>
            </button>
          ))}
          <button className="nav-item" title="Novo Projeto" onClick={handleNewProject}><Plus size={18} strokeWidth={1.5} /></button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <button className="nav-item" title="Settings" onClick={() => navigate('/settings')}><Settings size={18} strokeWidth={1.5} /></button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {view === 'home' && <MissionControl onOpenProject={openProject} />}
        {view === 'project' && (
          <ProjectView
            project={selectedProject}
            activeView={projectView}
            onViewChange={setProjectView}
            rightPanel={rightPanel}
            onRightPanelChange={setRightPanel}
            onBack={() => setView('home')}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================
// MISSION CONTROL ÔÇö The Command Center
// ============================================================

function MissionControl({ onOpenProject }: { onOpenProject: (p: Project) => void }) {
  const runningMissions = ALL_MISSIONS.filter(m => m.status === 'running');
  const allAgents = PROJECTS.flatMap(p => p.agents);
  const runningAgents = allAgents.filter(a => a.status === 'running' || a.status === 'working');
  const totalQueue = 12;

  return (
    <div className="mission-control">
      {/* Hero */}
      <div className="mc-hero">
        <div>
          <h1>Bom dia, Gabriel</h1>
          <p>{runningAgents.length} agentes trabalhando ┬À {runningMissions.length} miss├Áes ativas ┬À {totalQueue} tarefas na fila</p>
        </div>
      </div>

      <div className="mc-grid">
        {/* Missions */}
        <div className="mc-panel mc-missions">
          <div className="mc-panel-header">
            <h2><Target size={16} /> Miss├Áes em Execu├º├úo</h2>
            <span className="mc-badge">{runningMissions.length}</span>
          </div>
          <div className="missions-list">
            {ALL_MISSIONS.map(m => (
              <div key={m.id} className="mission-row" onClick={() => {
                const proj = PROJECTS.find(p => p.name === m.project);
                if (proj) onOpenProject(proj);
              }}>
                <div className="mission-status">
                  {m.status === 'running' && <Loader2 size={14} className="spin" />}
                  {m.status === 'completed' && <CheckCircle2 size={14} />}
                  {m.status === 'error' && <XCircle size={14} />}
                  {m.status === 'scheduled' && <Clock size={14} />}
                </div>
                <div className="mission-info">
                  <div className="mission-top">
                    <span className="mission-name">{m.name}</span>
                    <span className="mission-project">{m.project}</span>
                  </div>
                  <div className="mission-progress">
                    <div className="progress-track">
                      <div className={`progress-fill ${m.status}`} style={{ width: `${m.progress}%` }} />
                    </div>
                    <span className="progress-label">{m.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="mc-panel mc-agents">
          <div className="mc-panel-header">
            <h2><Bot size={16} /> Agentes</h2>
            <span className="mc-badge">{runningAgents.length}/{allAgents.length}</span>
          </div>
          <div className="agents-list">
            {allAgents.map(a => (
              <div key={a.id} className="agent-row">
                <div className="agent-dot" style={{ background: a.color }} />
                <div className="agent-info">
                  <span className="agent-name">{a.name}</span>
                  <span className="agent-task">{a.task}</span>
                </div>
                <span className={`agent-badge ${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Queue */}
        <div className="mc-panel mc-queue">
          <div className="mc-panel-header">
            <h2><Layers size={16} /> Fila</h2>
          </div>
          <div className="queue-content">
            <div className="queue-number">{totalQueue}</div>
            <div className="queue-label">tarefas aguardando</div>
            <div className="queue-breakdown">
              <span><CircleDot size={10} /> 3 workflows</span>
              <span><CircleDot size={10} /> 5 automa├º├Áes</span>
              <span><CircleDot size={10} /> 4 agentes</span>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="mc-panel mc-events">
          <div className="mc-panel-header">
            <h2><Activity size={16} /> Eventos</h2>
          </div>
          <div className="events-list">
            {ALL_EVENTS.map(e => (
              <div key={e.id} className="event-row">
                <div className={`event-icon ${e.type}`}>
                  {e.type === 'success' && <CheckCircle2 size={12} />}
                  {e.type === 'warning' && <AlertTriangle size={12} />}
                  {e.type === 'error' && <XCircle size={12} />}
                </div>
                <span className="event-text">{e.text}</span>
                <span className="event-project">{e.project}</span>
                <span className="event-time">{e.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Projects */}
        <div className="mc-panel mc-projects">
          <div className="mc-panel-header">
            <h2><FolderKanban size={16} /> Projetos</h2>
          </div>
          <div className="quick-projects">
            {PROJECTS.map(p => (
              <button key={p.id} className="quick-project" onClick={() => onOpenProject(p)}>
                <span className="qp-icon">{p.icon}</span>
                <div className="qp-info">
                  <span className="qp-name">{p.name}</span>
                  <span className="qp-meta">{p.agents.length} agents ┬À {p.workflows.length} workflows</span>
                </div>
                <ArrowUpRight size={14} className="qp-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROJECT VIEW ÔÇö Context-Aware
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
      {/* Project Topbar */}
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

      {/* Content */}
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
// PROJECT CHAT
// ============================================================

function ProjectChat({ project }: { project: Project }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; time: string; agent?: string }[]>([
    { id: '1', role: 'user', content: 'Analise o desempenho da ├║ltima campanha.', time: '10:30' },
    { id: '2', role: 'assistant', content: 'An├ílise conclu├¡da para o projeto ' + project.name + '.\n\n**M├®tricas:**\n- ROI: 4.2x\n- CAC: R$ 42.30\n- Convers├Áes: +23%\n\n**Recomenda├º├Áes:**\n- Aumentar budget em Instagram\n- Testar TikTok Ads', time: '10:31', agent: project.agents[0]?.name },
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: String(Date.now()), role: 'user' as const, content: input, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    await chatService.sendMessage(project.id, input);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'Processando no contexto do projeto ' + project.name + '...', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), agent: project.agents[0]?.name }]);
    }, 800);
  };

  return (
    <div className="project-chat">
      <div className="chat-messages">
        {messages.map(m => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-avatar">{m.role === 'user' ? <Users size={16} /> : <Bot size={16} />}</div>
            <div className="msg-body">
              <div className="msg-header">
                <span className="msg-role">{m.role === 'user' ? 'Voc├¬' : m.agent || project.name}</span>
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
          <input type="text" placeholder={`Enviar para ${project.name}...`} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
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
        {project.agents.map(a => (
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
          {project.workflows.map(w => (
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
          {project.artifacts.map(a => (
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
                <span className="artifact-card-meta">{a.type} ┬À {a.size}</span>
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
        <div className="form-group"><label>Nome</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="form-group"><label>Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)}>
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
// RIGHT PANELS
// ============================================================

function PipelinePanel({ project }: { project: Project }) {
  const activeAgent = project.agents.find(a => a.pipeline && a.pipeline.length > 0);

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
            {project.artifacts.map(a => (
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
