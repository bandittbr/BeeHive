import { useState } from 'react';
import {
  Home, MessageSquare, FolderKanban, Building2, Settings,
  Plus, Search, ChevronRight, ChevronDown, ArrowUpRight,
  Bot, Workflow, Zap, Brain, Code, BarChart3, Megaphone,
  FileText, Image, Video, Music, Globe, Package, Layers,
  GitBranch, Clock, Activity, Users, Sparkles, Terminal,
  Database, Shield, Bell, Palette, Key, Cpu, HardDrive,
  FileCode, Receipt, Info, Play, Pause, CheckCircle2,
  AlertTriangle, XCircle, MoreHorizontal, Send, Paperclip,
  Hash, Star, Archive, Trash2, Download, ExternalLink,
  TrendingUp, DollarSign, Eye, Calendar, Target, Rocket,
  CircleDot, Loader2, RefreshCw, Filter, SortAsc,
} from 'lucide-react';
import './App.css';

type MainArea = 'home' | 'chat' | 'projetos' | 'negocios' | 'settings';

export default function App() {
  const [activeArea, setActiveArea] = useState<MainArea>('home');
  const [activeProject, setActiveProject] = useState<string | null>(null);

  const handleNavigate = (area: MainArea, project?: string) => {
    setActiveArea(area);
    if (project) setActiveProject(project);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <Sparkles size={18} />
          </div>
          <span className="logo-text">BeeHive</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item${activeArea === 'home' ? ' active' : ''}`} onClick={() => handleNavigate('home')}>
            <Home size={18} strokeWidth={1.5} />
            <span>Home</span>
          </button>
          <button className={`nav-item${activeArea === 'chat' ? ' active' : ''}`} onClick={() => handleNavigate('chat')}>
            <MessageSquare size={18} strokeWidth={1.5} />
            <span>Chat</span>
          </button>
          <button className={`nav-item${activeArea === 'projetos' ? ' active' : ''}`} onClick={() => handleNavigate('projetos')}>
            <FolderKanban size={18} strokeWidth={1.5} />
            <span>Projetos</span>
          </button>
          <button className={`nav-item${activeArea === 'negocios' ? ' active' : ''}`} onClick={() => handleNavigate('negocios')}>
            <Building2 size={18} strokeWidth={1.5} />
            <span>Negócios</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-divider" />
          <button className={`nav-item${activeArea === 'settings' ? ' active' : ''}`} onClick={() => handleNavigate('settings')}>
            <Settings size={18} strokeWidth={1.5} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main">
        {activeArea === 'home' && <HomeView onNavigate={handleNavigate} />}
        {activeArea === 'chat' && <ChatView />}
        {activeArea === 'projetos' && <ProjetosView onNavigate={handleNavigate} />}
        {activeArea === 'negocios' && <NegociosView />}
        {activeArea === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

// ============================================================
// HOME — AI Operating System Cockpit
// ============================================================

interface MetricCard {
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: typeof Bot;
  color: string;
}

interface RecentProject {
  id: string;
  name: string;
  icon: string;
  progress: number;
  agents: number;
  lastAccess: string;
}

interface ActivityItem {
  id: string;
  icon: typeof CheckCircle2;
  text: string;
  time: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ArtifactItem {
  id: string;
  name: string;
  type: string;
  size: string;
  icon: typeof FileText;
}

const METRICS: MetricCard[] = [
  { label: 'Agentes Online', value: '6', change: '+2 hoje', changeType: 'up', icon: Bot, color: '#a855f7' },
  { label: 'Workflows Ativos', value: '14', change: '3 executando', changeType: 'neutral', icon: Workflow, color: '#3b82f6' },
  { label: 'Execuções Hoje', value: '284', change: '+12%', changeType: 'up', icon: Zap, color: '#f59e0b' },
  { label: 'Tempo Economizado', value: '6.2h', change: '+1.4h', changeType: 'up', icon: Clock, color: '#10b981' },
  { label: 'Artifacts', value: '47', change: '+8 hoje', changeType: 'up', icon: FileText, color: '#ec4899' },
  { label: 'Providers', value: '3', change: 'Todos online', changeType: 'neutral', icon: Cpu, color: '#6366f1' },
];

const RECENT_PROJECTS: RecentProject[] = [
  { id: '1', name: 'BeeHive', icon: '🐝', progress: 72, agents: 3, lastAccess: '2 min' },
  { id: '2', name: 'TradeAI', icon: '📈', progress: 45, agents: 2, lastAccess: '15 min' },
  { id: '3', name: 'Marketing', icon: '📢', progress: 88, agents: 4, lastAccess: '1h' },
  { id: '4', name: 'Cliente X', icon: '💼', progress: 23, agents: 1, lastAccess: '3h' },
];

const ACTIVITIES: ActivityItem[] = [
  { id: '1', icon: CheckCircle2, text: 'Video publicado no YouTube', time: '2 min', type: 'success' },
  { id: '2', icon: CheckCircle2, text: 'Workflow "Marketing Diário" concluído', time: '15 min', type: 'success' },
  { id: '3', icon: AlertTriangle, text: 'OpenRouter com latência alta', time: '30 min', type: 'warning' },
  { id: '4', icon: CheckCircle2, text: 'Browser scraping finalizado', time: '1h', type: 'success' },
  { id: '5', icon: CheckCircle2, text: 'Pesquisa de mercado concluída', time: '2h', type: 'success' },
  { id: '6', icon: XCircle, text: 'Deploy falhou — retry automático', time: '3h', type: 'error' },
];

const ARTIFACTS: ArtifactItem[] = [
  { id: '1', name: 'relatorio-q4.pdf', type: 'PDF', size: '2.4 MB', icon: FileText },
  { id: '2', name: 'thumbnail-campanha.png', type: 'Image', size: '156 KB', icon: Image },
  { id: '3', name: 'video-final.mp4', type: 'Video', size: '48 MB', icon: Video },
  { id: '4', name: 'script-automation.md', type: 'Markdown', size: '4.2 KB', icon: FileCode },
];

function HomeView({ onNavigate }: { onNavigate: (area: MainArea, project?: string) => void }) {
  return (
    <div className="home">
      {/* Hero */}
      <div className="hero">
        <div className="hero-text">
          <h1>Bom dia, Gabriel</h1>
          <p>6 agentes trabalhando · 14 workflows ativos · 284 execuções hoje</p>
        </div>
        <button className="btn-glow" onClick={() => onNavigate('chat')}>
          <MessageSquare size={16} />
          Nova Conversa
        </button>
      </div>

      {/* Metrics */}
      <div className="metrics">
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="metric-card">
              <div className="metric-icon" style={{ background: `${m.color}15`, color: m.color }}>
                <Icon size={20} />
              </div>
              <div className="metric-body">
                <span className="metric-value">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
              {m.change && (
                <span className={`metric-change ${m.changeType}`}>
                  {m.changeType === 'up' && <TrendingUp size={12} />}
                  {m.change}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="home-grid">
        {/* Recent Projects */}
        <div className="panel projects-panel">
          <div className="panel-header">
            <h2>Continue trabalhando</h2>
            <button className="btn-ghost-sm" onClick={() => onNavigate('projetos')}>Ver todos</button>
          </div>
          <div className="projects-list">
            {RECENT_PROJECTS.map(p => (
              <button key={p.id} className="project-row" onClick={() => onNavigate('projetos', p.name)}>
                <span className="project-icon">{p.icon}</span>
                <div className="project-info">
                  <span className="project-name">{p.name}</span>
                  <div className="project-meta">
                    <span className="project-progress">
                      <span className="progress-bar"><span className="progress-fill" style={{ width: `${p.progress}%` }} /></span>
                      {p.progress}%
                    </span>
                    <span className="project-agents"><Bot size={12} /> {p.agents}</span>
                    <span className="project-time">{p.lastAccess}</span>
                  </div>
                </div>
                <ArrowUpRight size={14} className="project-arrow" />
              </button>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="panel activity-panel">
          <div className="panel-header">
            <h2>Atividade Recente</h2>
            <button className="btn-ghost-sm">Ver tudo</button>
          </div>
          <div className="activity-list">
            {ACTIVITIES.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="activity-row">
                  <Icon size={14} className={`activity-icon ${a.type}`} />
                  <span className="activity-text">{a.text}</span>
                  <span className="activity-time">{a.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Artifacts */}
        <div className="panel artifacts-panel">
          <div className="panel-header">
            <h2>Artifacts Recentes</h2>
            <button className="btn-ghost-sm">Ver todos</button>
          </div>
          <div className="artifacts-grid">
            {ARTIFACTS.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="artifact-chip">
                  <Icon size={14} />
                  <span className="artifact-name">{a.name}</span>
                  <span className="artifact-size">{a.size}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agents Status */}
        <div className="panel agents-panel">
          <div className="panel-header">
            <h2>Equipe de Agentes</h2>
          </div>
          <div className="agents-list">
            {[
              { name: 'Marketing Agent', status: 'running', task: 'Gerando copy para Instagram', color: '#a855f7' },
              { name: 'Research Agent', status: 'idle', task: 'Aguardando tarefa', color: '#3b82f6' },
              { name: 'Video Agent', status: 'working', task: 'Editando vídeo final', color: '#10b981' },
              { name: 'Publishing Agent', status: 'waiting', task: 'Fila de publicação', color: '#f59e0b' },
            ].map(a => (
              <div key={a.name} className="agent-row">
                <div className="agent-dot" style={{ background: a.color }} />
                <div className="agent-info">
                  <span className="agent-name">{a.name}</span>
                  <span className="agent-task">{a.task}</span>
                </div>
                <span className={`agent-status ${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workflows */}
        <div className="panel workflows-panel">
          <div className="panel-header">
            <h2>Workflows</h2>
          </div>
          <div className="workflows-list">
            {[
              { name: 'Marketing Diário', status: 'running', progress: 98 },
              { name: 'Pesquisa Empresa', status: 'completed', progress: 100 },
              { name: 'Trade BTC', status: 'error', progress: 45 },
              { name: 'Publicação Instagram', status: 'scheduled', progress: 0 },
            ].map(w => (
              <div key={w.name} className="workflow-row">
                <div className="workflow-status">
                  {w.status === 'running' && <Loader2 size={14} className="spin" />}
                  {w.status === 'completed' && <CheckCircle2 size={14} />}
                  {w.status === 'error' && <XCircle size={14} />}
                  {w.status === 'scheduled' && <Clock size={14} />}
                </div>
                <div className="workflow-info">
                  <span className="workflow-name">{w.name}</span>
                  <span className={`workflow-status-text ${w.status}`}>{w.status}</span>
                </div>
                <span className="workflow-progress">{w.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHAT — The Center of the AI OS
// ============================================================

interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  starred?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Análise de Mercado Q4', preview: 'Dados compilados com sucesso...', time: '2 min', starred: true },
  { id: '2', title: 'Campanha Instagram', preview: '5 posts criados para...', time: '1h' },
  { id: '3', title: 'Code Review Módulo', preview: 'Refatoração sugerida...', time: '3h' },
  { id: '4', title: 'Pesquisa Concorrentes', preview: 'Top 5 concorrentes...', time: '1d' },
  { id: '5', title: 'Script YouTube', preview: 'Roteiro para vídeo de...', time: '2d', starred: true },
];

const MESSAGES: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Analise o desempenho da campanha de marketing do último trimestre.', time: '10:30' },
  { id: '2', role: 'assistant', content: 'Análise concluída. Aqui estão os principais insights:\n\n**Métricas do Trimestre:**\n- ROI: 4.2x (↑18% vs trimestre anterior)\n- CAC: R$ 42.30 (↓12%)\n- LTV: R$ 890 (↑23%)\n- Churn: 3.2% (↓0.8%)\n\n**Canais com melhor performance:**\n1. Instagram Ads — 45% das conversões\n2. Google Ads — 35% das conversões\n3. TikTok Ads — 20% das conversões\n\n**Recomendações:**\n- Aumentar budget em Instagram em 30%\n- Testar formatos Reels no TikTok\n- Implementar retargeting para carrinho abandonado\n- Criar campanha de relançamento para leads frios', time: '10:31' },
];

const AGENTS_LIST = ['Marketing Agent', 'Research Agent', 'Coding Agent', 'Video Agent'];
const MODELS_LIST = ['Claude Sonnet', 'GPT-4o', 'Llama 3 70B', 'Gemini Pro'];
const PROVIDERS_LIST = ['OpenRouter', 'OpenAI', 'Anthropic'];
const WORKFLOWS_LIST = ['Nenhum', 'Marketing Diário', 'Pesquisa Auto', 'Trade Bot'];

function ChatView() {
  const [selectedConv, setSelectedConv] = useState('1');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(MESSAGES);
  const [agent, setAgent] = useState('Marketing Agent');
  const [model, setModel] = useState('Claude Sonnet');
  const [provider, setProvider] = useState('OpenRouter');
  const [workflow, setWorkflow] = useState('Nenhum');
  const [showRightPanel, setShowRightPanel] = useState<'artifacts' | 'executions' | 'logs' | 'context' | null>('artifacts');

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = { id: String(Date.now()), role: 'user', content: input, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'Processando sua solicitação com o agente selecionado...', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
    }, 800);
  };

  return (
    <div className="chat">
      {/* Conversations Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Conversas</h2>
          <button className="btn-icon"><Plus size={16} /></button>
        </div>
        <div className="chat-search">
          <Search size={14} />
          <input type="text" placeholder="Buscar conversas..." />
        </div>
        <div className="chat-tabs">
          <button className="chat-tab active">Todas</button>
          <button className="chat-tab"><Star size={12} /> Favoritas</button>
          <button className="chat-tab"><Archive size={12} /> Arquivo</button>
        </div>
        <div className="conv-list">
          {CONVERSATIONS.map(c => (
            <button key={c.id} className={`conv-item${selectedConv === c.id ? ' active' : ''}`} onClick={() => setSelectedConv(c.id)}>
              <div className="conv-body">
                <span className="conv-title">{c.title}</span>
                <span className="conv-preview">{c.preview}</span>
              </div>
              <div className="conv-meta">
                <span className="conv-time">{c.time}</span>
                {c.starred && <Star size={10} className="conv-star" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Main */}
      <div className="chat-main">
        {/* Topbar with selectors */}
        <div className="chat-topbar">
          <div className="topbar-selectors">
            <div className="selector">
              <span className="selector-label">Projeto</span>
              <select><option>BeeHive</option><option>TradeAI</option><option>Marketing</option></select>
            </div>
            <div className="selector-divider" />
            <div className="selector">
              <span className="selector-label">Agente</span>
              <select value={agent} onChange={e => setAgent(e.target.value)}>
                {AGENTS_LIST.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="selector-divider" />
            <div className="selector">
              <span className="selector-label">Modelo</span>
              <select value={model} onChange={e => setModel(e.target.value)}>
                {MODELS_LIST.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="selector-divider" />
            <div className="selector">
              <span className="selector-label">Provider</span>
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                {PROVIDERS_LIST.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="selector-divider" />
            <div className="selector">
              <span className="selector-label">Workflow</span>
              <select value={workflow} onChange={e => setWorkflow(e.target.value)}>
                {WORKFLOWS_LIST.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>
          <div className="topbar-actions">
            <button className={`btn-icon${showRightPanel === 'artifacts' ? ' active' : ''}`} onClick={() => setShowRightPanel(showRightPanel === 'artifacts' ? null : 'artifacts')} title="Artifacts"><Layers size={16} /></button>
            <button className={`btn-icon${showRightPanel === 'logs' ? ' active' : ''}`} onClick={() => setShowRightPanel(showRightPanel === 'logs' ? null : 'logs')} title="Logs"><Terminal size={16} /></button>
            <button className={`btn-icon${showRightPanel === 'context' ? ' active' : ''}`} onClick={() => setShowRightPanel(showRightPanel === 'context' ? null : 'context')} title="Context"><Database size={16} /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map(m => (
            <div key={m.id} className={`msg ${m.role}`}>
              <div className="msg-avatar">{m.role === 'user' ? <Users size={16} /> : <Bot size={16} />}</div>
              <div className="msg-body">
                <div className="msg-header">
                  <span className="msg-role">{m.role === 'user' ? 'Você' : agent}</span>
                  <span className="msg-time">{m.time}</span>
                </div>
                <div className="msg-content">{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="chat-input">
          <div className="input-wrapper">
            <button className="input-action"><Paperclip size={16} /></button>
            <input type="text" placeholder="Digite sua mensagem..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
            <button className="input-send" onClick={handleSend}><Send size={16} /></button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      {showRightPanel && (
        <div className="chat-right-panel">
          <div className="right-panel-header">
            <span>{showRightPanel === 'artifacts' ? 'Artifacts' : showRightPanel === 'logs' ? 'Logs' : 'Contexto'}</span>
            <button className="btn-icon" onClick={() => setShowRightPanel(null)}><XCircle size={14} /></button>
          </div>
          <div className="right-panel-body">
            {showRightPanel === 'artifacts' && (
              <div className="artifacts-list">
                {ARTIFACTS.map(a => {
                  const Icon = a.icon;
                  return (
                    <div key={a.id} className="artifact-row">
                      <Icon size={14} />
                      <div className="artifact-info">
                        <span className="artifact-name">{a.name}</span>
                        <span className="artifact-meta">{a.type} · {a.size}</span>
                      </div>
                      <button className="btn-icon-sm"><Download size={12} /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {showRightPanel === 'logs' && (
              <div className="logs-list">
                {['[10:30] Workflow started', '[10:31] Agent response generated', '[10:32] Artifact saved', '[10:33] Memory updated'].map((l, i) => (
                  <div key={i} className="log-line"><code>{l}</code></div>
                ))}
              </div>
            )}
            {showRightPanel === 'context' && (
              <div className="context-info">
                <div className="context-row"><span>Memória utilizada</span><span>2.4 KB</span></div>
                <div className="context-row"><span>Tokens na conversa</span><span>1,247</span></div>
                <div className="context-row"><span>Artifacts vinculados</span><span>3</span></div>
                <div className="context-row"><span>Projeto</span><span>BeeHive</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROJETOS — Workspaces
// ============================================================

interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  agents: number;
  workflows: number;
  tags: string[];
  lastAccess: string;
}

const PROJECTS: Project[] = [
  { id: '1', name: 'BeeHive', description: 'Plataforma de IA modular e extensível', icon: '🐝', status: 'active', progress: 72, agents: 3, workflows: 8, tags: ['Platform', 'TypeScript'], lastAccess: '2 min' },
  { id: '2', name: 'TradeAI', description: 'Sistema de trading automatizado', icon: '📈', status: 'active', progress: 45, agents: 2, workflows: 5, tags: ['AI', 'Python'], lastAccess: '15 min' },
  { id: '3', name: 'Marketing Digital', description: 'Campanhas e conteúdo para redes sociais', icon: '📢', status: 'active', progress: 88, agents: 4, workflows: 12, tags: ['Marketing', 'Social'], lastAccess: '1h' },
  { id: '4', name: 'Cliente X', description: 'Projeto de consultoria', icon: '💼', status: 'paused', progress: 23, agents: 1, workflows: 3, tags: ['Consulting'], lastAccess: '3h' },
  { id: '5', name: 'Estudo OAB', description: 'Material de estudo para exame', icon: '📚', status: 'completed', progress: 100, agents: 1, workflows: 2, tags: ['Study'], lastAccess: '1w' },
];

function ProjetosView({ onNavigate }: { onNavigate: (area: MainArea) => void }) {
  return (
    <div className="projetos">
      <div className="page-header">
        <div>
          <h1>Projetos</h1>
          <p>Workspaces e ambientes de trabalho</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Novo Projeto</button>
      </div>

      <div className="projects-grid">
        {PROJECTS.map(p => (
          <div key={p.id} className="project-card">
            <div className="project-card-top">
              <span className="project-icon-lg">{p.icon}</span>
              <span className={`status-dot ${p.status}`} />
            </div>
            <h3>{p.name}</h3>
            <p className="project-desc">{p.description}</p>
            <div className="project-progress-bar">
              <div className="progress-fill" style={{ width: `${p.progress}%` }} />
            </div>
            <div className="project-stats">
              <span><Bot size={12} /> {p.agents} agents</span>
              <span><Workflow size={12} /> {p.workflows} workflows</span>
              <span>{p.progress}%</span>
            </div>
            <div className="project-tags">
              {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
            <div className="project-card-footer">
              <span className="project-last">{p.lastAccess}</span>
              <button className="btn-ghost-sm">Abrir <ArrowUpRight size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// NEGÓCIOS — Organized Categories
// ============================================================

interface BizCategory {
  id: string;
  name: string;
  icon: typeof Brain;
  color: string;
  modules: { id: string; name: string; icon: typeof Bot; desc: string }[];
}

const BIZ_CATEGORIES: BizCategory[] = [
  {
    id: 'ia', name: 'Inteligência Artificial', icon: Brain, color: '#a855f7',
    modules: [
      { id: 'agents', name: 'Agentes', icon: Bot, desc: 'Assistentes de IA' },
      { id: 'skills', name: 'Skills', icon: Sparkles, desc: 'Habilidades' },
      { id: 'memory', name: 'Memory', icon: Database, desc: 'Memória do sistema' },
      { id: 'browser', name: 'Browser', icon: Globe, desc: 'Navegação web' },
    ],
  },
  {
    id: 'conteudo', name: 'Conteúdo', icon: FileText, color: '#10b981',
    modules: [
      { id: 'image', name: 'Image', icon: Image, desc: 'Geração de imagens' },
      { id: 'video', name: 'Video', icon: Video, desc: 'Geração de vídeos' },
      { id: 'audio', name: 'Audio', icon: Music, desc: 'Geração de áudio' },
      { id: 'shorts', name: 'Shorts', icon: Zap, desc: 'Vídeos curtos' },
    ],
  },
  {
    id: 'automacao', name: 'Automação', icon: Zap, color: '#3b82f6',
    modules: [
      { id: 'workflows', name: 'Workflows', icon: GitBranch, desc: 'Fluxos de trabalho' },
      { id: 'scheduler', name: 'Scheduler', icon: Calendar, desc: 'Agendamentos' },
      { id: 'triggers', name: 'Triggers', icon: Target, desc: 'Gatilhos' },
      { id: 'queue', name: 'Queue', icon: Layers, desc: 'Fila de tarefas' },
      { id: 'webhooks', name: 'Webhooks', icon: Globe, desc: 'Endpoints HTTP' },
    ],
  },
  {
    id: 'marketing', name: 'Marketing', icon: Megaphone, color: '#f59e0b',
    modules: [
      { id: 'instagram', name: 'Instagram', icon: Instagram, desc: 'Gestão de perfil' },
      { id: 'tiktok', name: 'TikTok', icon: Music, desc: 'Gestão de conteúdo' },
      { id: 'facebook', name: 'Facebook', icon: Globe, desc: 'Gestão de página' },
      { id: 'youtube', name: 'YouTube', icon: Video, desc: 'Gestão de canal' },
      { id: 'analytics', name: 'Analytics', icon: BarChart3, desc: 'Análises e relatórios' },
    ],
  },
  {
    id: 'business', name: 'Business', icon: Package, color: '#ef4444',
    modules: [
      { id: 'produtos', name: 'Produtos', icon: Package, desc: 'Gestão de produtos' },
      { id: 'crm', name: 'CRM', icon: Users, desc: 'Relacionamento' },
      { id: 'finance', name: 'Finance', icon: DollarSign, desc: 'Gestão financeira' },
      { id: 'affiliates', name: 'Afiliados', icon: TrendingUp, desc: 'Programa de afiliados' },
    ],
  },
  {
    id: 'dev', name: 'Desenvolvimento', icon: Code, color: '#6366f1',
    modules: [
      { id: 'coding', name: 'Coding', icon: Terminal, desc: 'Assistente de código' },
      { id: 'github', name: 'GitHub', icon: GitBranch, desc: 'Repositórios' },
      { id: 'deploy', name: 'Deploy', icon: Rocket, desc: 'Publicação' },
      { id: 'templates', name: 'Templates', icon: FileCode, desc: 'Modelos prontos' },
      { id: 'integrations', name: 'Integrações', icon: Layers, desc: 'Serviços externos' },
    ],
  },
];

function Instagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function NegociosView() {
  return (
    <div className="negocios">
      <div className="page-header">
        <div>
          <h1>Negócios</h1>
          <p>Módulos e ferramentas do BeeHive</p>
        </div>
      </div>

      <div className="biz-grid">
        {BIZ_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.id} className="biz-card">
              <div className="biz-card-header" style={{ '--cat-color': cat.color } as React.CSSProperties}>
                <div className="biz-icon" style={{ background: `${cat.color}18`, color: cat.color }}>
                  <CatIcon size={20} />
                </div>
                <h2>{cat.name}</h2>
              </div>
              <div className="biz-modules">
                {cat.modules.map(mod => {
                  const ModIcon = mod.icon;
                  return (
                    <button key={mod.id} className="biz-module">
                      <ModIcon size={16} />
                      <div className="biz-module-info">
                        <span className="biz-module-name">{mod.name}</span>
                        <span className="biz-module-desc">{mod.desc}</span>
                      </div>
                      <ChevronRight size={14} className="biz-module-arrow" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
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
          {SETTINGS_GROUPS.map(g => (
            <div key={g.label} className="settings-group">
              <span className="settings-group-label">{g.label}</span>
              {g.items.map(item => {
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
            <div className="form-group"><label>Nome</label><input type="text" placeholder="Seu nome" /></div>
            <div className="form-group"><label>Email</label><input type="email" placeholder="seu@email.com" /></div>
            <div className="form-group"><label>Bio</label><textarea rows={3} placeholder="Conte-nos sobre você..." /></div>
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
            ].map(p => (
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
            <h2>{SETTINGS_GROUPS.flatMap(g => g.items).find(i => i.id === page)?.label}</h2>
            <p className="settings-desc">Em desenvolvimento</p>
          </div>
        )}
      </div>
    </div>
  );
}
