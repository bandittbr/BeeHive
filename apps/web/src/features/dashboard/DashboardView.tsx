/**
 * DashboardView — tela inicial do BeeHive.
 *
 * Pensa como a "vitrine" do produto: valor de cara, acesso rápido às áreas
 * e sinais de confiança (saúde do sistema, providers, plano). Foco em vender
 * a ideia de um Sistema Operacional de IA completo e profissional.
 */

import { Icon, type IconName } from '@/components/common/Icon';
import './DashboardView.css';

interface FeatureCard {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  tone: 'yellow' | 'purple' | 'pink' | 'blue';
}

const FEATURES: FeatureCard[] = [
  {
    id: 'conversation',
    icon: 'chat',
    title: 'Conversa',
    description: 'Peça qualquer coisa em linguagem natural. O BeeHive executa, pesquisa e entrega.',
    tone: 'yellow',
  },
  {
    id: 'projects',
    icon: 'folder',
    title: 'Projetos',
    description: 'Gerencie repositórios locais como unidades de trabalho do seu SO de IA.',
    tone: 'blue',
  },
  {
    id: 'business',
    icon: 'briefcase',
    title: 'Negócios',
    description: 'Afiliados, produtos e criação de conteúdo — operações end-to-end.',
    tone: 'purple',
  },
  {
    id: 'cortes',
    icon: 'film',
    title: 'Cortes Youtube',
    description: 'Agentes que transformam vídeos longos em Shorts publicados sozinhos.',
    tone: 'pink',
  },
  {
    id: 'configuracoes',
    icon: 'gear',
    title: 'AI Providers',
    description: 'Conecte OpenAI, Anthropic, Gemini, Groq e mais. Tudo num só lugar.',
    tone: 'yellow',
  },
  {
    id: 'agentes',
    icon: 'agents',
    title: 'Agentes',
    description: 'Executores especializados prontos pra ampliar o que o BeeHive faz.',
    tone: 'blue',
  },
];

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  return (
    <div className="dashboard">
      {/* Hero */}
      <section className="dashboard__hero">
        <div className="dashboard__hero-mark" aria-hidden>
          <Icon name="hexagon" size={40} strokeWidth={2} />
        </div>
        <span className="dashboard__eyebrow">Sistema Operacional de Inteligência Artificial</span>
        <h1 className="dashboard__title">
          A colmeia de IA que <span className="dashboard__title-accent">trabalha por você</span>
        </h1>
        <p className="dashboard__subtitle">
          Converse, crie, automatize e escale. O BeeHive reúne modelos, agentes e ferramentas
          em uma única plataforma profissional — do primeiro prompt à operação completa.
        </p>
        <div className="dashboard__actions">
          <button className="btn btn-primary" onClick={() => onNavigate('conversation')}>
            <Icon name="chat" size={18} />
            Começar a conversar
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('configuracoes')}>
            <Icon name="gear" size={18} />
            Conectar providers
          </button>
        </div>

        <ul className="dashboard__trust">
          <li>
            <Icon name="check-circle" size={16} />
            10 providers de IA prontos
          </li>
          <li>
            <Icon name="check-circle" size={16} />
            Local-first e privado
          </li>
          <li>
            <Icon name="check-circle" size={16} />
            Plano Ultimate incluso
          </li>
        </ul>
      </section>

      {/* Status do sistema */}
      <section className="dashboard__status">
        <div className="dashboard__status-item">
          <span className="status-dot status-dot--online" />
          <div>
            <strong>Runtime ativo</strong>
            <span>big-pickle (OpenCode)</span>
          </div>
        </div>
        <div className="dashboard__status-item">
          <Icon name="bolt" size={18} />
          <div>
            <strong>Resposta instantânea</strong>
            <span>sem fila de espera</span>
          </div>
        </div>
        <div className="dashboard__status-item">
          <Icon name="shield" size={18} />
          <div>
            <strong>Credenciais criptografadas</strong>
            <span>armazenadas localmente</span>
          </div>
        </div>
      </section>

      {/* Grade de áreas */}
      <section className="dashboard__features">
        <header className="dashboard__section-head">
          <h2>Explore o BeeHive</h2>
          <p>Cada módulo é uma fava da colmeia — juntos formam o seu SO de IA.</p>
        </header>
        <div className="dashboard__grid">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              className="dashboard__card"
              data-tone={feature.tone}
              onClick={() => onNavigate(feature.id === 'cortes' ? 'business' : feature.id)}
            >
              <span className="dashboard__card-icon">
                <Icon name={feature.icon} size={22} />
              </span>
              <span className="dashboard__card-title">{feature.title}</span>
              <span className="dashboard__card-desc">{feature.description}</span>
              <span className="dashboard__card-arrow">
                <Icon name="arrow-right" size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
