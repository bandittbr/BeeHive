import { useState } from 'react';
import {
  MessageSquare,
  FolderKanban,
  Grid3X3,
  Settings,
  Home,
  Plus,
  Search,
  ChevronRight,
  Bot,
  Workflow,
  Zap,
  Brain,
  Code,
  BarChart3,
  Megaphone,
  FileText,
  Image,
  Video,
  Music,
  Globe,
  Package,
  Layers,
  GitBranch,
  Clock,
  Activity,
  Users,
  ArrowUpRight,
  Sparkles,
  Terminal,
  Database,
  Shield,
  Bell,
  Palette,
  Key,
  Cpu,
  HardDrive,
  FileCode,
  Receipt,
  Info,
} from 'lucide-react';
import './App.css';

type MainArea = 'home' | 'chat' | 'projetos' | 'negocios' | 'settings';

const NAV_ITEMS: { id: MainArea; label: string; icon: typeof MessageSquare }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'negocios', label: 'Negócios', icon: Grid3X3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activeArea, setActiveArea] = useState<MainArea>('home');

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Sparkles size={20} />
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeArea === item.id;
            return (
              <button
                key={item.id}
                className={`nav-btn${isActive ? ' active' : ''}`}
                onClick={() => setActiveArea(item.id)}
                title={item.label}
              >
                <Icon size={20} strokeWidth={1.5} />
                {isActive && <span className="nav-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-btn" title="New">
            <Plus size={20} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeArea === 'home' && <HomeView onNavigate={setActiveArea} />}
        {activeArea === 'chat' && <ChatView />}
        {activeArea === 'projetos' && <ProjetosView />}
        {activeArea === 'negocios' && <NegociosView />}
        {activeArea === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

// ============================================================
// HOME / DASHBOARD VIEW
// ============================================================

interface ActivityItem {
  id: string;
  type: 'workflow' | 'agent' | 'artifact' | 'chat';
  title: string;
  description: string;
  time: string;
  status: 'running' | 'completed' | 'failed';
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: '1', type: 'workflow', title: 'Marketing Campaign', description: 'Gerando copy para Instagram...', time: '2 min', status: 'running' },
  { id: '2', type: 'agent', title: 'TradeAI Agent', description: 'Análise de mercado concluída', time: '15 min', status: 'completed' },
  { id: '3', type: 'artifact', title: 'Relatório Q4', description: 'PDF gerado com sucesso', time: '1h', status: 'completed' },
  { id: '4', type: 'chat', title: 'Research Session', description: 'Comparação de modelos AI', time: '2h', status: 'completed' },
  { id: '5', type: 'workflow', title: 'Data Pipeline', description: 'Erro na conexão com API', time: '3h', status: 'failed' },
];

const MOCK_WORKFLOWS = [
  { id: '1', name: 'Content Generator', runs: 47, success: 94, icon: FileText },
  { id: '2', name: 'Data Analyst', runs: 23, success: 100, icon: BarChart3 },
  { id: '3', name: 'Social Poster', runs: 156, success: 98, icon: Megaphone },
];

const MOCK_AGENTS = [
  { id: '1', name: 'Assistant', status: 'active', tasks: 12, icon: Bot },
  { id: '2', name: 'Researcher', status: 'idle', tasks: 5, icon: Search },
  { id: '3', name: 'Coder', status: 'active', tasks: 3, icon: Code },
];

function HomeView({ onNavigate }: { onNavigate: (area: MainArea) => void }) {
  return (
    <div className="home-view">
      {/* Header */}
      <div className="home-header">
        <div>
          <h1>Bom dia, Gabriel</h1>
          <p className="home-subtitle">Seu sistema de IA está funcionando</p>
        </div>
        <div className="home-header-actions">
          <button className="btn-primary" onClick={() => onNavigate('chat')}>
            <MessageSquare size={16} />
            Nova Conversa
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">12</span>
            <span className="stat-label">Workflows Ativos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Bot size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">5</span>
            <span className="stat-label">Agentes Rodando</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Zap size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">284</span>
            <span className="stat-label">Tarefas Hoje</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">6.2h</span>
            <span className="stat-label">Tempo Economizado</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="home-grid">
        {/* Recent Activity */}
        <div className="home-card activity-card">
          <div className="card-header">
            <h2>Atividade Recente</h2>
            <button className="btn-ghost-sm">Ver tudo</button>
          </div>
          <div className="activity-list">
            {MOCK_ACTIVITIES.map(item => (
              <div key={item.id} className="activity-item">
                <div className={`activity-status ${item.status}`} />
                <div className="activity-info">
                  <span className="activity-title">{item.title}</span>
                  <span className="activity-desc">{item.description}</span>
                </div>
                <span className="activity-time">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Workflows */}
        <div className="home-card workflows-card">
          <div className="card-header">
            <h2>Workflows</h2>
            <button className="btn-ghost-sm">Ver todos</button>
          </div>
          <div className="workflows-list">
            {MOCK_WORKFLOWS.map(wf => {
              const Icon = wf.icon;
              return (
                <div key={wf.id} className="workflow-item">
                  <div className="workflow-icon">
                    <Icon size={18} />
                  </div>
                  <div className="workflow-info">
                    <span className="workflow-name">{wf.name}</span>
                    <span className="workflow-stats">{wf.runs} runs · {wf.success}% success</span>
                  </div>
                  <button className="btn-run">
                    <Zap size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Agents */}
        <div className="home-card agents-card">
          <div className="card-header">
            <h2>Agentes</h2>
            <button className="btn-ghost-sm">Gerenciar</button>
          </div>
          <div className="agents-list">
            {MOCK_AGENTS.map(agent => {
              const Icon = agent.icon;
              return (
                <div key={agent.id} className="agent-item">
                  <div className="agent-avatar">
                    <Icon size={20} />
                  </div>
                  <div className="agent-info">
                    <span className="agent-name">{agent.name}</span>
                    <span className={`agent-status ${agent.status}`}>{agent.status}</span>
                  </div>
                  <span className="agent-tasks">{agent.tasks} tasks</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Access */}
        <div className="home-card quick-card">
          <div className="card-header">
            <h2>Acesso Rápido</h2>
          </div>
          <div className="quick-grid">
            <button className="quick-item" onClick={() => onNavigate('chat')}>
              <MessageSquare size={20} />
              <span>Chat</span>
            </button>
            <button className="quick-item" onClick={() => onNavigate('projetos')}>
              <FolderKanban size={20} />
              <span>Projetos</span>
            </button>
            <button className="quick-item" onClick={() => onNavigate('negocios')}>
              <Grid3X3 size={20} />
              <span>Módulos</span>
            </button>
            <button className="quick-item" onClick={() => onNavigate('settings')}>
              <Settings size={20} />
              <span>Config</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHAT VIEW
// ============================================================

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  agent?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'TradeAI Strategy', lastMessage: 'Análise do mercado...', timestamp: '2 min', agent: 'Researcher' },
  { id: '2', title: 'Marketing Campaign', lastMessage: 'Criar copy para...', timestamp: '1h', agent: 'Assistant' },
  { id: '3', title: 'Code Review', lastMessage: 'Refatorar o módulo...', timestamp: '3h', agent: 'Coder' },
  { id: '4', title: 'Research AI Models', lastMessage: 'Comparar GPT-4 vs...', timestamp: '1d', agent: 'Researcher' },
];

const MOCK_MESSAGES: Message[] = [
  { id: '1', role: 'user', content: 'Analise o desempenho da nossa última campanha de marketing.', timestamp: '10:30' },
  { id: '2', role: 'assistant', content: 'Analisando os dados da campanha...\n\n**Métricas Principais:**\n- Taxa de conversão: +23% vs mês anterior\n- ROI: 4.2x\n- CAC: R$ 45.20\n\n**Canais com melhor performance:**\n1. Instagram Ads (45%)\n2. Google Ads (35%)\n3. TikTok Ads (20%)\n\n**Recomendações:**\n- Aumentar investimento em Instagram\n- Testar TikTok Ads no próximo ciclo\n- Implementar retargeting para visitantes', timestamp: '10:31', agent: 'Assistant' },
];

const AGENTS = ['Assistant', 'Researcher', 'Coder', 'Analyst'];
const MODELS = ['GPT-4o', 'Claude 3.5', 'Llama 3 70B', 'Gemini Pro'];
const PROVIDERS = ['OpenRouter', 'OpenAI', 'Anthropic'];

function ChatView() {
  const [selectedConv, setSelectedConv] = useState<string>('1');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [showArtifacts, setShowArtifacts] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('Assistant');
  const [selectedModel, setSelectedModel] = useState('GPT-4o');
  const [selectedProvider, setSelectedProvider] = useState('OpenRouter');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');

    setTimeout(() => {
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: 'Processando sua solicitação...\n\nAnalisando os dados disponíveis e gerando insights relevantes. Posso ajudar com mais alguma coisa?',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        agent: selectedAgent,
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 1000);
  };

  return (
    <div className="chat-layout">
      {/* Conversations Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Conversas</h2>
          <button className="btn-icon" title="New conversation">
            <Plus size={16} />
          </button>
        </div>
        <div className="chat-search">
          <Search size={14} />
          <input type="text" placeholder="Buscar..." />
        </div>
        <div className="conversation-list">
          {MOCK_CONVERSATIONS.map(conv => (
            <button
              key={conv.id}
              className={`conversation-item${selectedConv === conv.id ? ' active' : ''}`}
              onClick={() => setSelectedConv(conv.id)}
            >
              <div className="conv-info">
                <span className="conv-title">{conv.title}</span>
                <span className="conv-preview">{conv.lastMessage}</span>
              </div>
              <div className="conv-meta">
                <span className="conv-time">{conv.timestamp}</span>
                {conv.agent && <span className="conv-agent">{conv.agent}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            <h3>{MOCK_CONVERSATIONS.find(c => c.id === selectedConv)?.title}</h3>
          </div>
          <div className="chat-header-right">
            <div className="header-selector">
              <label>Agent</label>
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="header-selector">
              <label>Model</label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="header-selector">
              <label>Provider</label>
              <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button
              className={`btn-icon${showArtifacts ? ' active' : ''}`}
              onClick={() => setShowArtifacts(!showArtifacts)}
              title="Toggle artifacts"
            >
              <Layers size={16} />
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? <Users size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-role">{msg.role === 'user' ? 'Você' : msg.agent || 'BeeHive'}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-text">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="Enviar mensagem..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="btn-send" onClick={handleSend}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="chat-input-hint">
            Enter para enviar · Shift+Enter para nova linha
          </div>
        </div>
      </div>

      {/* Artifacts Panel */}
      {showArtifacts && (
        <div className="artifacts-panel">
          <div className="artifacts-header">
            <span>Artifacts</span>
          </div>
          <div className="artifacts-body">
            <div className="artifact-item">
              <FileText size={16} />
              <div className="artifact-info">
                <span className="artifact-name">relatorio-q4.pdf</span>
                <span className="artifact-size">2.4 MB</span>
              </div>
            </div>
            <div className="artifact-item">
              <Image size={16} />
              <div className="artifact-info">
                <span className="artifact-name">chart-revenue.png</span>
                <span className="artifact-size">156 KB</span>
              </div>
            </div>
            <div className="artifact-item">
              <FileCode size={16} />
              <div className="artifact-info">
                <span className="artifact-name">analysis.py</span>
                <span className="artifact-size">4.2 KB</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROJETOS VIEW
// ============================================================

interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'paused' | 'completed';
  tags: string[];
  agents: number;
  workflows: number;
  updatedAt: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'TradeAI', description: 'Sistema de trading automatizado com IA', icon: '📈', status: 'active', tags: ['AI', 'Trading', 'Python'], agents: 3, workflows: 5, updatedAt: '2 min' },
  { id: '2', name: 'BeeHive', description: 'Plataforma de IA modular e extensível', icon: '🐝', status: 'active', tags: ['Platform', 'TypeScript', 'React'], agents: 2, workflows: 8, updatedAt: '1h' },
  { id: '3', name: 'Estudo OAB', description: 'Material de estudo para exame da OAB', icon: '📚', status: 'paused', tags: ['Study', 'Law'], agents: 1, workflows: 2, updatedAt: '3d' },
  { id: '4', name: 'Marketing Digital', description: 'Campanhas e conteúdo para redes sociais', icon: '📢', status: 'active', tags: ['Marketing', 'Social'], agents: 4, workflows: 12, updatedAt: '5h' },
  { id: '5', name: 'Cliente X', description: 'Projeto de consultoria para empresa X', icon: '💼', status: 'active', tags: ['Consulting', 'Enterprise'], agents: 2, workflows: 3, updatedAt: '1d' },
  { id: '6', name: 'Automação RH', description: 'Processos automatizados de recursos humanos', icon: '🔄', status: 'completed', tags: ['Automation', 'HR'], agents: 1, workflows: 4, updatedAt: '1w' },
];

function ProjetosView() {
  return (
    <div className="projetos-view">
      <div className="view-header">
        <div>
          <h1>Projetos</h1>
          <p className="view-subtitle">Workspaces e ambientes de trabalho</p>
        </div>
        <button className="btn-primary">
          <Plus size={16} />
          Novo Projeto
        </button>
      </div>

      <div className="projects-grid">
        {MOCK_PROJECTS.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-card-header">
              <span className="project-icon">{project.icon}</span>
              <span className={`status-badge ${project.status}`}>{project.status}</span>
            </div>
            <h3 className="project-name">{project.name}</h3>
            <p className="project-description">{project.description}</p>
            <div className="project-tags">
              {project.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            <div className="project-metrics">
              <div className="project-metric">
                <Bot size={14} />
                <span>{project.agents} agents</span>
              </div>
              <div className="project-metric">
                <Workflow size={14} />
                <span>{project.workflows} workflows</span>
              </div>
            </div>
            <div className="project-footer">
              <span className="project-time">Atualizado {project.updatedAt}</span>
              <button className="btn-ghost">
                Abrir
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// NEGÓCIOS VIEW
// ============================================================

interface ModuleCategory {
  id: string;
  name: string;
  icon: typeof Bot;
  color: string;
  modules: Module[];
}

interface Module {
  id: string;
  name: string;
  icon: typeof Bot;
  description: string;
}

const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    id: 'ia',
    name: 'Inteligência Artificial',
    icon: Brain,
    color: '#a855f7',
    modules: [
      { id: 'agents', name: 'Agentes', icon: Bot, description: 'Assistentes de IA personalizados' },
      { id: 'skills', name: 'Skills', icon: Sparkles, description: 'Habilidades e competências' },
      { id: 'memory', name: 'Memory', icon: Database, description: 'Memória do sistema' },
      { id: 'knowledge', name: 'Knowledge Base', icon: Layers, description: 'Base de conhecimento' },
    ],
  },
  {
    id: 'automacao',
    name: 'Automação',
    icon: Zap,
    color: '#3b82f6',
    modules: [
      { id: 'workflows', name: 'Workflows', icon: GitBranch, description: 'Fluxos de trabalho' },
      { id: 'automations', name: 'Automações', icon: Workflow, description: 'Tarefas automatizadas' },
      { id: 'schedules', name: 'Agendamentos', icon: Clock, description: 'Tarefas agendadas' },
      { id: 'triggers', name: 'Triggers', icon: Zap, description: 'Gatilhos e eventos' },
    ],
  },
  {
    id: 'conteudo',
    name: 'Conteúdo',
    icon: FileText,
    color: '#10b981',
    modules: [
      { id: 'youtube', name: 'YouTube', icon: Video, description: 'Gestão de canal' },
      { id: 'instagram', name: 'Instagram', icon: Image, description: 'Gestão de perfil' },
      { id: 'tiktok', name: 'TikTok', icon: Music, description: 'Gestão de conteúdo' },
      { id: 'blog', name: 'Blog', icon: FileText, description: 'Artigos e posts' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: Megaphone,
    color: '#f59e0b',
    modules: [
      { id: 'campaigns', name: 'Campanhas', icon: Megaphone, description: 'Campanhas de marketing' },
      { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Análises e relatórios' },
      { id: 'seo', name: 'SEO', icon: Globe, description: 'Otimização para buscadores' },
      { id: 'email', name: 'Email Marketing', icon: Bell, description: 'Campanhas por email' },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Package,
    color: '#ef4444',
    modules: [
      { id: 'finance', name: 'Finance', icon: Receipt, description: 'Gestão financeira' },
      { id: 'products', name: 'Produtos', icon: Package, description: 'Gestão de produtos' },
      { id: 'affiliates', name: 'Afiliados', icon: Users, description: 'Programa de afiliados' },
      { id: 'crm', name: 'CRM', icon: Users, description: 'Relacionamento com clientes' },
    ],
  },
  {
    id: 'dev',
    name: 'Desenvolvimento',
    icon: Code,
    color: '#6366f1',
    modules: [
      { id: 'coding', name: 'Coding', icon: Terminal, description: 'Assistente de código' },
      { id: 'browser', name: 'Browser', icon: Globe, description: 'Navegação web' },
      { id: 'templates', name: 'Templates', icon: FileCode, description: 'Modelos prontos' },
      { id: 'integrations', name: 'Integrações', icon: Layers, description: 'Serviços externos' },
    ],
  },
];

function NegociosView() {
  return (
    <div className="negocios-view">
      <div className="view-header">
        <div>
          <h1>Negócios</h1>
          <p className="view-subtitle">Módulos e ferramentas do BeeHive</p>
        </div>
      </div>

      <div className="categories-grid">
        {MODULE_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          return (
            <div key={cat.id} className="category-card">
              <div className="category-header" style={{ borderColor: cat.color }}>
                <div className="category-icon" style={{ background: `${cat.color}15`, color: cat.color }}>
                  <CatIcon size={20} />
                </div>
                <h2 className="category-name">{cat.name}</h2>
              </div>
              <div className="category-modules">
                {cat.modules.map(mod => {
                  const ModIcon = mod.icon;
                  return (
                    <button key={mod.id} className="module-item">
                      <ModIcon size={16} />
                      <div className="module-info">
                        <span className="module-name">{mod.name}</span>
                        <span className="module-desc">{mod.description}</span>
                      </div>
                      <ChevronRight size={14} className="module-arrow" />
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
// SETTINGS VIEW
// ============================================================

type SettingsSection = 'perfil' | 'conta' | 'aparencia' | 'notificacoes' | 'providers' | 'modelos' | 'permissoes' | 'seguranca' | 'memoria' | 'storage' | 'advanced' | 'sobre';

interface SettingsGroup {
  label: string;
  items: { id: SettingsSection; label: string; icon: typeof User }[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: 'Conta',
    items: [
      { id: 'perfil', label: 'Perfil', icon: Users },
      { id: 'conta', label: 'Conta', icon: Shield },
      { id: 'notificacoes', label: 'Notificações', icon: Bell },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'providers', label: 'Providers', icon: Cpu },
      { id: 'modelos', label: 'Modelos', icon: Bot },
      { id: 'permissoes', label: 'Permissões', icon: Key },
      { id: 'seguranca', label: 'Segurança', icon: Shield },
    ],
  },
  {
    label: 'Dados',
    items: [
      { id: 'memoria', label: 'Memória', icon: Database },
      { id: 'storage', label: 'Storage', icon: HardDrive },
    ],
  },
  {
    label: 'Personalização',
    items: [
      { id: 'aparencia', label: 'Aparência', icon: Palette },
      { id: 'advanced', label: 'Avançado', icon: Settings },
      { id: 'sobre', label: 'Sobre', icon: Info },
    ],
  },
];

const ALL_SETTINGS_SECTIONS = SETTINGS_GROUPS.flatMap(g => g.items);

function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('perfil');

  return (
    <div className="settings-layout">
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2>Settings</h2>
        </div>
        <nav className="settings-nav">
          {SETTINGS_GROUPS.map(group => (
            <div key={group.label} className="settings-group">
              <span className="settings-group-label">{group.label}</span>
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="settings-content">
        <SettingsSectionContent section={activeSection} />
      </div>
    </div>
  );
}

function SettingsSectionContent({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'perfil':
      return (
        <div className="settings-section">
          <h2>Perfil</h2>
          <p className="section-description">Gerencie suas informações pessoais</p>
          <div className="form-group">
            <label>Nome</label>
            <input type="text" placeholder="Seu nome" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="seu@email.com" />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea placeholder="Conte-nos sobre você..." rows={3} />
          </div>
          <button className="btn-primary">Salvar</button>
        </div>
      );
    case 'providers':
      return (
        <div className="settings-section">
          <h2>Providers</h2>
          <p className="section-description">Configure seus provedores de IA</p>
          <div className="providers-list">
            <div className="provider-card">
              <div className="provider-header">
                <span className="provider-name">OpenRouter</span>
                <span className="status-badge active">Conectado</span>
              </div>
              <p className="provider-desc">Acesso a múltiplos modelos via OpenRouter</p>
              <div className="form-group">
                <label>API Key</label>
                <input type="password" placeholder="sk-or-..." />
              </div>
            </div>
            <div className="provider-card">
              <div className="provider-header">
                <span className="provider-name">OpenAI</span>
                <span className="status-badge inactive">Não configurado</span>
              </div>
              <p className="provider-desc">GPT-4, GPT-3.5, DALL-E</p>
              <div className="form-group">
                <label>API Key</label>
                <input type="password" placeholder="sk-..." />
              </div>
            </div>
            <div className="provider-card">
              <div className="provider-header">
                <span className="provider-name">Anthropic</span>
                <span className="status-badge inactive">Não configurado</span>
              </div>
              <p className="provider-desc">Claude 3.5, Claude 3 Opus</p>
              <div className="form-group">
                <label>API Key</label>
                <input type="password" placeholder="sk-ant-..." />
              </div>
            </div>
          </div>
        </div>
      );
    case 'modelos':
      return (
        <div className="settings-section">
          <h2>Modelos</h2>
          <p className="section-description">Configure os modelos padrão</p>
          <div className="form-group">
            <label>Chat Model</label>
            <select>
              <option>GPT-4o</option>
              <option>Claude 3.5 Sonnet</option>
              <option>Llama 3 70B</option>
              <option>Gemini Pro</option>
            </select>
          </div>
          <div className="form-group">
            <label>Coding Model</label>
            <select>
              <option>GPT-4o</option>
              <option>Claude 3.5 Sonnet</option>
              <option>CodeLlama</option>
            </select>
          </div>
          <div className="form-group">
            <label>Temperature</label>
            <input type="range" min={0} max={2} step={0.1} defaultValue={0.7} />
            <span className="range-value">0.7</span>
          </div>
          <div className="form-group">
            <label>Max Tokens</label>
            <input type="number" defaultValue={4096} />
          </div>
        </div>
      );
    case 'aparencia':
      return (
        <div className="settings-section">
          <h2>Aparência</h2>
          <p className="section-description">Personalize a aparência do BeeHive</p>
          <div className="form-group">
            <label>Tema</label>
            <div className="theme-options">
              <button className="theme-btn active">🌙 Dark</button>
              <button className="theme-btn">☀️ Light</button>
              <button className="theme-btn">💻 System</button>
            </div>
          </div>
          <div className="form-group">
            <label>Idioma</label>
            <select>
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div className="form-group">
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span>Animações</span>
            </label>
          </div>
        </div>
      );
    case 'sobre':
      return (
        <div className="settings-section">
          <h2>Sobre</h2>
          <p className="section-description">Informações sobre o BeeHive</p>
          <div className="about-info">
            <div className="about-item">
              <span className="about-label">Versão</span>
              <span className="about-value">0.1.0</span>
            </div>
            <div className="about-item">
              <span className="about-label">Architecture</span>
              <span className="about-value">v1.0 (Frozen)</span>
            </div>
            <div className="about-item">
              <span className="about-label">Runtime</span>
              <span className="about-value status-online">Online</span>
            </div>
            <div className="about-item">
              <span className="about-label">Plugins</span>
              <span className="about-value">3 loaded</span>
            </div>
            <div className="about-item">
              <span className="about-label">Providers</span>
              <span className="about-value">2 available</span>
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className="settings-section">
          <h2>{ALL_SETTINGS_SECTIONS.find(n => n.id === section)?.label}</h2>
          <p className="section-description">Configuração em desenvolvimento</p>
          <div className="empty-state">
            <p>Esta seção será implementada em breve.</p>
          </div>
        </div>
      );
  }
}
