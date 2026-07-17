import { useState } from 'react';
import {
  MessageSquare, FolderKanban, Grid3x3, Settings, Search, Bell,
  ChevronDown, Plus, Paperclip, Globe, Code2, Image as ImageIcon, Mic,
  ArrowUp, BarChart3, Sparkles, Zap, Bot, Layers, Workflow, Clock,
  Users, Brain, Palette, PackageOpen, Boxes, GitBranch, Compass,
  Video, Music2, Terminal as TerminalIcon, DollarSign, Megaphone,
  PlaySquare, Camera, Puzzle, Share2, Handshake, ShoppingBag,
  FileText, ChevronRight, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import './App.css';

// ============================================================
// TYPES & MOCK DATA
// ============================================================

interface Conversation {
  id: string;
  title: string;
  time: string;
  group: 'Hoje' | 'Ontem';
}

const CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Plano de marketing para lançamento do TradeAI', time: '14:32', group: 'Hoje' },
  { id: '2', title: 'Análise de dados de vendas - Maio/2025', time: '11:08', group: 'Hoje' },
  { id: '3', title: 'Criação de agentes especializados', time: '09:45', group: 'Hoje' },
  { id: '4', title: 'Automação Instagram BeeHive', time: '21:30', group: 'Ontem' },
  { id: '5', title: 'Estratégia de conteúdo YouTube', time: '18:22', group: 'Ontem' },
  { id: '6', title: 'Análise de concorrentes mercado IA', time: '16:40', group: 'Ontem' },
];

const QUICK_ACTIONS = [
  { icon: MessageSquare, title: 'Nova conversa', subtitle: 'Iniciar do zero' },
  { icon: BarChart3, title: 'Analisar dados', subtitle: 'Gerar insights' },
  { icon: ImageIcon, title: 'Criar imagem', subtitle: 'Gerar com IA' },
  { icon: Zap, title: 'Executar workflow', subtitle: 'Automatizar tarefas' },
];

interface Module {
  icon: typeof Bot;
  name: string;
  desc: string;
  color: string;
}

const MODULES: Module[] = [
  { icon: Bot, name: 'Agentes', desc: 'Gerencie seus agentes de IA', color: '#a855f7' },
  { icon: Zap, name: 'Skills', desc: 'Habilidades e capacidades', color: '#eab308' },
  { icon: Workflow, name: 'Workflows', desc: 'Fluxos de automação', color: '#8b5cf6' },
  { icon: Clock, name: 'Automations', desc: 'Automações agendadas', color: '#3b82f6' },
  { icon: Layers, name: 'Templates', desc: 'Modelos prontos', color: '#f97316' },
  { icon: FolderKanban, name: 'Artifacts', desc: 'Arquivos e resultados', color: '#a855f7' },
  { icon: Brain, name: 'Knowledge Base', desc: 'Base de conhecimento', color: '#06b6d4' },
  { icon: Sparkles, name: 'Memory', desc: 'Memória do sistema', color: '#ec4899' },
  { icon: BarChart3, name: 'Analytics', desc: 'Métricas e insights', color: '#22c55e' },
  { icon: Puzzle, name: 'Integrations', desc: 'Integrações e APIs', color: '#f97316' },
  { icon: Compass, name: 'Browser', desc: 'Navegação e scraping', color: '#3b82f6' },
  { icon: ImageIcon, name: 'Image', desc: 'Geração de imagens', color: '#ec4899' },
  { icon: Video, name: 'Video', desc: 'Geração de vídeos', color: '#ef4444' },
  { icon: Music2, name: 'Audio', desc: 'Processamento de áudio', color: '#a855f7' },
  { icon: Code2, name: 'Coding', desc: 'Assistente de código', color: '#06b6d4' },
  { icon: DollarSign, name: 'Finance', desc: 'Finanças e trading', color: '#22c55e' },
  { icon: Megaphone, name: 'Marketing', desc: 'Marketing e growth', color: '#ef4444' },
  { icon: PlaySquare, name: 'YouTube', desc: 'Automação YouTube', color: '#ef4444' },
  { icon: Camera, name: 'Instagram', desc: 'Automação Instagram', color: '#ec4899' },
  { icon: Puzzle, name: 'TikTok', desc: 'Automação TikTok', color: '#e4e4e7' },
  { icon: Share2, name: 'Facebook', desc: 'Automação Facebook', color: '#3b82f6' },
  { icon: Handshake, name: 'Afiliados', desc: 'Gestão de afiliados', color: '#a855f7' },
  { icon: PackageOpen, name: 'Produtos', desc: 'Gestão de produtos', color: '#f97316' },
  { icon: ShoppingBag, name: 'Marketplace', desc: 'Plugins e extensões', color: '#eab308' },
  { icon: FileText, name: 'Logs', desc: 'Logs do sistema', color: '#71717a' },
];

interface Execution {
  id: string;
  name: string;
  status: 'success' | 'error';
  time: string;
}

const EXECUTIONS: Execution[] = [
  { id: 'e1', name: 'Workflow: Post Instagram', status: 'success', time: '2 min atrás' },
  { id: 'e2', name: 'Workflow: Análise de Leads', status: 'success', time: '15 min atrás' },
  { id: 'e3', name: 'Workflow: Relatório Diário', status: 'success', time: '1 hora atrás' },
  { id: 'e4', name: 'Workflow: Sync YouTube', status: 'error', time: '2 horas atrás' },
];

interface ActivityItem {
  id: string;
  icon: 'star' | 'flow' | 'plug' | 'clean';
  text: string;
  time: string;
}

const ACTIVITY: ActivityItem[] = [
  { id: 'a1', icon: 'star', text: 'Agente TraderAI executou análise de mercado', time: '2 min atrás' },
  { id: 'a2', icon: 'flow', text: 'Workflow Post Instagram foi concluído', time: '15 min atrás' },
  { id: 'a3', icon: 'plug', text: 'Nova integração com OpenRouter adicionada', time: '1 hora atrás' },
  { id: 'a4', icon: 'clean', text: 'Backup automático realizado com sucesso', time: '3 horas atrás' },
  { id: 'a5', icon: 'clean', text: 'Limpeza de memória concluída', time: '5 horas atrás' },
];

// ============================================================
// APP
// ============================================================

export default function App() {
  const [navActive, setNavActive] = useState<'chat' | 'projetos' | 'negocios' | 'settings'>('chat');
  const [message, setMessage] = useState('');

  return (
    <div className="app">
      <NavRail active={navActive} onChange={setNavActive} />
      <ConversationsPanel />
      <div className="center-col">
        <TopBar />
        <div className="content-scroll">
          <ChatPanel message={message} onMessageChange={setMessage} />
          <NegociosSection />
        </div>
      </div>
      <RightSidebar />
    </div>
  );
}

// ============================================================
// NAV RAIL
// ============================================================

function NavRail({ active, onChange }: { active: string; onChange: (v: any) => void }) {
  const items = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'projetos', icon: FolderKanban, label: 'Projetos' },
    { id: 'negocios', icon: Grid3x3, label: 'Negócios' },
  ];

  return (
    <aside className="nav-rail">
      <div className="nav-logo">
        <div className="nav-logo-mark"><Boxes size={18} /></div>
        <span className="nav-logo-text">BeeHive</span>
      </div>

      <nav className="nav-list">
        {items.map(it => (
          <button
            key={it.id}
            className={`nav-link${active === it.id ? ' active' : ''}`}
            onClick={() => onChange(it.id)}
          >
            <it.icon size={17} strokeWidth={1.8} />
            <span>{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-bottom">
        <button
          className={`nav-link${active === 'settings' ? ' active' : ''}`}
          onClick={() => onChange('settings')}
        >
          <Settings size={17} strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        <div className="plan-card">
          <div className="plan-card-title">
            <Sparkles size={13} />
            <span>Plano Premium</span>
          </div>
          <p className="plan-card-desc">Uso ilimitado de agentes, workflows e integrações.</p>
          <div className="plan-progress-track">
            <div className="plan-progress-fill" style={{ width: '78%' }} />
          </div>
          <div className="plan-progress-row">
            <span>Uso atual</span>
            <span>78%</span>
          </div>
          <button className="plan-collapse-btn">
            <ChevronDown size={13} />
            <span>Recolher</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// CONVERSATIONS PANEL
// ============================================================

function ConversationsPanel() {
  const groups: Array<'Hoje' | 'Ontem'> = ['Hoje', 'Ontem'];

  return (
    <aside className="conversations-panel">
      <div className="conv-header">
        <span className="conv-title">Conversas</span>
      </div>

      <button className="new-conv-btn">
        <Plus size={15} />
        <span>Nova conversa</span>
      </button>

      <div className="conv-list">
        {groups.map(group => (
          <div key={group} className="conv-group">
            <div className="conv-group-label">{group}</div>
            {CONVERSATIONS.filter(c => c.group === group).map(c => (
              <button key={c.id} className="conv-item">
                <span className="conv-item-title">{c.title}</span>
                <span className="conv-item-time">{c.time}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <button className="conv-view-all">Ver todas</button>
    </aside>
  );
}

// ============================================================
// TOP BAR
// ============================================================

function TopBar() {
  return (
    <header className="topbar">
      <h1 className="topbar-title">Home</h1>
      <div className="topbar-right">
        <div className="search-box">
          <Search size={15} />
          <span>Buscar (Ctrl + K)</span>
        </div>
        <button className="bell-btn">
          <Bell size={17} />
          <span className="bell-dot" />
        </button>
        <button className="user-chip">
          <div className="user-avatar">GT</div>
          <div className="user-info">
            <span className="user-name">Gabriel T.</span>
            <span className="user-plan">Premium</span>
          </div>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}

// ============================================================
// CHAT PANEL
// ============================================================

function ChatPanel({ message, onMessageChange }: { message: string; onMessageChange: (v: string) => void }) {
  return (
    <section className="chat-panel">
      <div className="chat-panel-header">
        <h2 className="chat-title">Chat</h2>
        <div className="chat-selectors">
          <button className="selector-pill">
            <Compass size={14} />
            <span>OpenRouter</span>
            <ChevronDown size={13} />
          </button>
          <button className="selector-pill">
            <Boxes size={14} />
            <span>gpt-4o</span>
            <ChevronDown size={13} />
          </button>
          <button className="icon-square-btn"><Palette size={15} /></button>
        </div>
      </div>

      <div className="chat-empty">
        <div className="chat-empty-mark"><Boxes size={26} /></div>
        <h3>Olá, Gabriel! 👋</h3>
        <p>O que vamos criar hoje?</p>
      </div>

      <div className="quick-actions">
        {QUICK_ACTIONS.map(qa => (
          <button key={qa.title} className="quick-action-card">
            <qa.icon size={18} />
            <div>
              <span className="qa-title">{qa.title}</span>
              <span className="qa-subtitle">{qa.subtitle}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="chat-input-box">
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={e => onMessageChange(e.target.value)}
        />
        <div className="chat-input-actions">
          <div className="chat-input-actions-left">
            <button className="input-icon-btn"><Paperclip size={16} /></button>
            <button className="input-icon-btn"><Globe size={16} /></button>
            <button className="input-icon-btn"><Code2 size={16} /></button>
            <button className="input-icon-btn"><ImageIcon size={16} /></button>
          </div>
          <div className="chat-input-actions-right">
            <button className="input-icon-btn"><Mic size={16} /></button>
            <button className="input-send-btn"><ArrowUp size={16} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// NEGÓCIOS SECTION
// ============================================================

function NegociosSection() {
  return (
    <section className="negocios-section">
      <div className="negocios-header">
        <div>
          <h2>Negócios</h2>
          <p>Acesse todos os módulos do BeeHive</p>
        </div>
        <button className="ver-modulos-btn">
          Ver todos os módulos
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="modules-grid">
        {MODULES.map(m => (
          <button key={m.name} className="module-card">
            <div className="module-icon" style={{ color: m.color, background: `${m.color}1F` }}>
              <m.icon size={17} />
            </div>
            <div className="module-info">
              <span className="module-name">{m.name}</span>
              <span className="module-desc">{m.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// RIGHT SIDEBAR
// ============================================================

function RightSidebar() {
  return (
    <aside className="right-sidebar">
      <div className="rs-panel">
        <div className="rs-panel-header">
          <span>Resumo do Sistema</span>
          <span className="rs-updated">Atualizado agora</span>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Agentes ativos</span>
            <span className="stat-value">12</span>
            <span className="stat-delta up">+2 hoje</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Workflows</span>
            <span className="stat-value">28</span>
            <span className="stat-delta up">+5 hoje</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Execuções (24h)</span>
            <span className="stat-value">156</span>
            <span className="stat-delta up">+12%</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tokens usados</span>
            <span className="stat-value">2.4M</span>
            <span className="stat-delta up">+18%</span>
          </div>
        </div>
      </div>

      <div className="rs-panel">
        <div className="rs-panel-header">
          <span>Execuções Recentes</span>
        </div>
        <div className="exec-list">
          {EXECUTIONS.map(e => (
            <div key={e.id} className="exec-row">
              <span className={`exec-dot ${e.status}`}>
                {e.status === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              </span>
              <span className="exec-name">{e.name}</span>
              <span className="exec-meta">
                <span className={`exec-status ${e.status}`}>{e.status === 'success' ? 'Concluído' : 'Falhou'}</span>
                <span className="exec-time">{e.time}</span>
              </span>
            </div>
          ))}
        </div>
        <button className="ver-todas-btn">Ver todas</button>
      </div>

      <div className="rs-panel">
        <div className="rs-panel-header">
          <span>Atividade Recente</span>
        </div>
        <div className="activity-list">
          {ACTIVITY.map(a => (
            <div key={a.id} className="activity-row">
              <span className={`activity-icon ${a.icon}`}>
                {a.icon === 'star' && <Sparkles size={13} />}
                {a.icon === 'flow' && <Workflow size={13} />}
                {a.icon === 'plug' && <GitBranch size={13} />}
                {a.icon === 'clean' && <Loader2 size={13} />}
              </span>
              <div className="activity-info">
                <span className="activity-text">{a.text}</span>
                <span className="activity-time">{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
