import { useState } from 'react';
import {
  MessageSquare,
  FolderKanban,
  Grid3X3,
  Settings,
  Plus,
  Search,
  ChevronRight,
} from 'lucide-react';
import './App.css';

type MainArea = 'chat' | 'projetos' | 'negocios' | 'settings';

const NAV_ITEMS: { id: MainArea; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'negocios', label: 'Negócios', icon: Grid3X3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activeArea, setActiveArea] = useState<MainArea>('chat');

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🐝</div>
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
        {activeArea === 'chat' && <ChatView />}
        {activeArea === 'projetos' && <ProjetosView />}
        {activeArea === 'negocios' && <NegociosView />}
        {activeArea === 'settings' && <SettingsView />}
      </main>
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
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'TradeAI Strategy', lastMessage: 'Análise do mercado...', timestamp: '2 min' },
  { id: '2', title: 'Marketing Campaign', lastMessage: 'Criar copy para...', timestamp: '1h' },
  { id: '3', title: 'Code Review', lastMessage: 'Refatorar o módulo...', timestamp: '3h' },
  { id: '4', title: 'Research AI Models', lastMessage: 'Comparar GPT-4 vs...', timestamp: '1d' },
];

const MOCK_MESSAGES: Message[] = [
  { id: '1', role: 'user', content: 'Analise o desempenho da nossa última campanha de marketing.', timestamp: '10:30' },
  { id: '2', role: 'assistant', content: 'Analisando os dados da campanha... A taxa de conversão aumentou 23% no último mês. O ROI foi de 4.2x. Os canais que melhor performaram foram Instagram Ads (45%) e Google Ads (35%). Recomendamos aumentar o investimento em Instagram e testar TikTok Ads para o próximo ciclo.', timestamp: '10:31' },
];

function ChatView() {
  const [selectedConv, setSelectedConv] = useState<string>('1');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [showArtifacts, setShowArtifacts] = useState(true);

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
        content: 'Processando sua solicitação... Analisando os dados disponíveis e gerando insights relevantes.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
          <input type="text" placeholder="Buscar conversas..." />
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
              <span className="conv-time">{conv.timestamp}</span>
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
            <select className="model-select">
              <option>GPT-4o</option>
              <option>Claude 3.5</option>
              <option>Llama 3</option>
            </select>
            <select className="provider-select">
              <option>OpenRouter</option>
              <option>OpenAI</option>
              <option>Anthropic</option>
            </select>
            <button
              className={`btn-icon${showArtifacts ? ' active' : ''}`}
              onClick={() => setShowArtifacts(!showArtifacts)}
              title="Toggle artifacts"
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🐝'}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-role">{msg.role === 'user' ? 'Você' : 'BeeHive'}</span>
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
            Pressione Enter para enviar
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
            <p className="empty-state">Nenhum artifact ainda.</p>
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
  updatedAt: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'TradeAI', description: 'Sistema de trading automatizado com IA', icon: '📈', status: 'active', tags: ['AI', 'Trading', 'Python'], updatedAt: '2 min' },
  { id: '2', name: 'BeeHive', description: 'Plataforma de IA modular e extensível', icon: '🐝', status: 'active', tags: ['Platform', 'TypeScript', 'React'], updatedAt: '1h' },
  { id: '3', name: 'Estudo OAB', description: 'Material de estudo para exame da OAB', icon: '📚', status: 'paused', tags: ['Study', 'Law'], updatedAt: '3d' },
  { id: '4', name: 'Marketing Digital', description: 'Campanhas e conteúdo para redes sociais', icon: '📢', status: 'active', tags: ['Marketing', 'Social'], updatedAt: '5h' },
  { id: '5', name: 'Cliente X', description: 'Projeto de consultoria para empresa X', icon: '💼', status: 'active', tags: ['Consulting', 'Enterprise'], updatedAt: '1d' },
  { id: '6', name: 'Automação RH', description: 'Processos automatizados de recursos humanos', icon: '🔄', status: 'completed', tags: ['Automation', 'HR'], updatedAt: '1w' },
];

function ProjetosView() {
  return (
    <div className="projetos-view">
      <div className="view-header">
        <div>
          <h1>Projetos</h1>
          <p className="view-subtitle">Gerencie seus workspaces</p>
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
            <div className="project-footer">
              <span className="project-time">Atualizado {project.updatedAt}</span>
              <button className="btn-ghost">Abrir</button>
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

interface Module {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'core' | 'content' | 'business' | 'media';
}

const MODULES: Module[] = [
  { id: 'agents', name: 'Agentes', icon: '🤖', description: 'Gerencie seus assistentes de IA', category: 'core' },
  { id: 'skills', name: 'Skills', icon: '🧠', description: 'Habilidades e competências', category: 'core' },
  { id: 'workflows', name: 'Workflows', icon: '⚡', description: 'Automações e fluxos', category: 'core' },
  { id: 'automations', name: 'Automações', icon: '🔄', description: 'Tarefas automatizadas', category: 'core' },
  { id: 'browser', name: 'Browser', icon: '🌐', description: 'Navegação web automatizada', category: 'core' },
  { id: 'coding', name: 'Coding', icon: '💻', description: 'Assistente de código', category: 'core' },
  { id: 'analytics', name: 'Analytics', icon: '📈', description: 'Análises e relatórios', category: 'business' },
  { id: 'finance', name: 'Finance', icon: '📊', description: 'Gestão financeira', category: 'business' },
  { id: 'marketing', name: 'Marketing', icon: '📢', description: 'Campanhas e conteúdo', category: 'business' },
  { id: 'youtube', name: 'YouTube', icon: '📺', description: 'Gestão de canal', category: 'content' },
  { id: 'instagram', name: 'Instagram', icon: '📱', description: 'Gestão de perfil', category: 'content' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', description: 'Gestão de conteúdo', category: 'content' },
  { id: 'afiliados', name: 'Afiliados', icon: '🛍', description: 'Programa de afiliados', category: 'business' },
  { id: 'produtos', name: 'Produtos', icon: '📦', description: 'Gestão de produtos', category: 'business' },
  { id: 'integrations', name: 'Integrações', icon: '🧩', description: 'Conecte serviços externos', category: 'core' },
  { id: 'templates', name: 'Templates', icon: '🗂', description: 'Modelos prontos', category: 'core' },
  { id: 'artifacts', name: 'Artifacts', icon: '📁', description: 'Arquivos e resultados', category: 'core' },
  { id: 'knowledge', name: 'Knowledge Base', icon: '📚', description: 'Base de conhecimento', category: 'core' },
  { id: 'memory', name: 'Memory', icon: '🧠', description: 'Memória do sistema', category: 'core' },
  { id: 'logs', name: 'Logs', icon: '📜', description: 'Histórico de atividades', category: 'core' },
  { id: 'image', name: 'Image', icon: '🖼', description: 'Geração de imagens', category: 'media' },
  { id: 'video', name: 'Video', icon: '🎬', description: 'Geração de vídeos', category: 'media' },
  { id: 'audio', name: 'Audio', icon: '🎤', description: 'Geração de áudio', category: 'media' },
  { id: 'research', name: 'Research', icon: '🔍', description: 'Pesquisa avançada', category: 'core' },
];

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  content: 'Content',
  business: 'Business',
  media: 'Media',
};

function NegociosView() {
  const categories = ['core', 'content', 'business', 'media'];

  return (
    <div className="negocios-view">
      <div className="view-header">
        <div>
          <h1>Negócios</h1>
          <p className="view-subtitle">Acesse todos os módulos do BeeHive</p>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat} className="module-category">
          <h2 className="category-title">{CATEGORY_LABELS[cat]}</h2>
          <div className="modules-grid">
            {MODULES.filter(m => m.category === cat).map(mod => (
              <button key={mod.id} className="module-card">
                <span className="module-icon">{mod.icon}</span>
                <div className="module-info">
                  <span className="module-name">{mod.name}</span>
                  <span className="module-description">{mod.description}</span>
                </div>
                <ChevronRight size={16} className="module-arrow" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SETTINGS VIEW
// ============================================================

type SettingsSection = 'perfil' | 'conta' | 'aparencia' | 'idioma' | 'notificacoes' | 'api-keys' | 'providers' | 'modelos' | 'permissoes' | 'seguranca' | 'memoria' | 'storage' | 'database' | 'planos' | 'billing' | 'logs' | 'preferencias' | 'avancado' | 'sobre';

const SETTINGS_NAV: { id: SettingsSection; label: string; icon: string }[] = [
  { id: 'perfil', label: 'Perfil', icon: '👤' },
  { id: 'conta', label: 'Conta', icon: '🔐' },
  { id: 'aparencia', label: 'Aparência', icon: '🎨' },
  { id: 'idioma', label: 'Idioma', icon: '🌍' },
  { id: 'notificacoes', label: 'Notificações', icon: '🔔' },
  { id: 'api-keys', label: 'API Keys', icon: '🔑' },
  { id: 'providers', label: 'Providers', icon: '🔌' },
  { id: 'modelos', label: 'Modelos', icon: '🤖' },
  { id: 'permissoes', label: 'Permissões', icon: '🔒' },
  { id: 'seguranca', label: 'Segurança', icon: '🛡' },
  { id: 'memoria', label: 'Memória', icon: '🧠' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'database', label: 'Banco de Dados', icon: '🗄' },
  { id: 'planos', label: 'Planos', icon: '📋' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'logs', label: 'Logs', icon: '📜' },
  { id: 'preferencias', label: 'Preferências', icon: '⚙' },
  { id: 'avancado', label: 'Avançado', icon: '🔧' },
  { id: 'sobre', label: 'Sobre', icon: 'ℹ' },
];

function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('perfil');

  return (
    <div className="settings-layout">
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2>Settings</h2>
        </div>
        <nav className="settings-nav">
          {SETTINGS_NAV.map(item => (
            <button
              key={item.id}
              className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="settings-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
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
    case 'conta':
      return (
        <div className="settings-section">
          <h2>Conta</h2>
          <p className="section-description">Gerencie sua conta e assinatura</p>
          <div className="form-group">
            <label>Plano Atual</label>
            <div className="plan-card">
              <span className="plan-name">Free</span>
              <button className="btn-ghost">Upgrade</button>
            </div>
          </div>
          <div className="form-group">
            <label className="toggle">
              <input type="checkbox" />
              <span>Modo développeur</span>
            </label>
          </div>
          <button className="btn-danger">Deletar Conta</button>
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
              <span>Compactar sidebar</span>
            </label>
          </div>
          <div className="form-group">
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span>Animações</span>
            </label>
          </div>
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
                <span className="status-badge active">Connected</span>
              </div>
              <p className="provider-description">Acesso a múltiplos modelos via OpenRouter</p>
              <div className="form-group">
                <label>API Key</label>
                <input type="password" placeholder="sk-or-..." />
              </div>
            </div>
            <div className="provider-card">
              <div className="provider-header">
                <span className="provider-name">OpenAI</span>
                <span className="status-badge inactive">Not configured</span>
              </div>
              <p className="provider-description">GPT-4, GPT-3.5, DALL-E</p>
              <div className="form-group">
                <label>API Key</label>
                <input type="password" placeholder="sk-..." />
              </div>
            </div>
            <div className="provider-card">
              <div className="provider-header">
                <span className="provider-name">Anthropic</span>
                <span className="status-badge inactive">Not configured</span>
              </div>
              <p className="provider-description">Claude 3.5, Claude 3 Opus</p>
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
    case 'permissoes':
      return (
        <div className="settings-section">
          <h2>Permissões</h2>
          <p className="section-description">Controle o acesso do BeeHive</p>
          <div className="form-group">
            <label>Browser</label>
            <select defaultValue="allow">
              <option value="allow">Permitir</option>
              <option value="ask">Perguntar</option>
              <option value="deny">Bloquear</option>
            </select>
          </div>
          <div className="form-group">
            <label>Files</label>
            <select defaultValue="ask">
              <option value="allow">Permitir</option>
              <option value="ask">Perguntar</option>
              <option value="deny">Bloquear</option>
            </select>
          </div>
          <div className="form-group">
            <label>External APIs</label>
            <select defaultValue="allow">
              <option value="allow">Permitir</option>
              <option value="ask">Perguntar</option>
              <option value="deny">Bloquear</option>
            </select>
          </div>
        </div>
      );
    case 'memoria':
      return (
        <div className="settings-section">
          <h2>Memória</h2>
          <p className="section-description">Configure a memória do sistema</p>
          <div className="form-group">
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span>Habilitar memória</span>
            </label>
          </div>
          <div className="form-group">
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span>Auto-save</span>
            </label>
          </div>
          <div className="form-group">
            <label>Max memories</label>
            <input type="number" defaultValue={1000} />
          </div>
          <div className="form-group">
            <label>Categorias</label>
            <div className="checkbox-group">
              <label className="toggle"><input type="checkbox" defaultChecked /><span>Preferences</span></label>
              <label className="toggle"><input type="checkbox" defaultChecked /><span>Projects</span></label>
              <label className="toggle"><input type="checkbox" defaultChecked /><span>People</span></label>
              <label className="toggle"><input type="checkbox" defaultChecked /><span>Knowledge</span></label>
            </div>
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
              <span className="about-value">Online</span>
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
          <h2>{SETTINGS_NAV.find(n => n.id === section)?.label}</h2>
          <p className="section-description">Configuração em desenvolvimento</p>
          <div className="empty-state">
            <p>Esta seção será implementada em breve.</p>
          </div>
        </div>
      );
  }
}
