import {
  ArrowUpRight, Bell, Bot, BriefcaseBusiness, CheckCircle2, ChevronRight,
  Clapperboard, Code2, FileText, FolderKanban, LayoutDashboard, MessageSquare,
  Network, Play, Plus, Search, Send, Sparkles, TrendingUp, Users,
} from 'lucide-react';
import type { ActivityEvent, Mission, Project } from '../../types';
import './overview.css';

type Props = {
  projects: Project[];
  events: ActivityEvent[];
  missions: Mission[];
  userName: string;
  onOpenChat: () => void;
  onOpenProjects: () => void;
  onOpenBusiness: () => void;
};

const activityIcon = (type: ActivityEvent['type']) => {
  if (type === 'error') return <Code2 size={16} />;
  if (type === 'warning') return <Search size={16} />;
  return <CheckCircle2 size={16} />;
};

export function OverviewDashboard({ projects, events, missions, userName, onOpenChat, onOpenProjects, onOpenBusiness }: Props) {
  const agents = projects.flatMap((project) => project.agents || []);
  const runningAgents = agents.filter((agent) => agent.status === 'working' || agent.status === 'running');
  const activeProjects = projects.filter((project) => project.status === 'active');
  const todayTasks = missions.filter((mission) => mission.status === 'running').length;
  const initials = userName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'BH';

  return (
    <section className="overview-page">
      <div className="overview-topbar">
        <div className="overview-mobile-title"><LayoutDashboard size={18} /> Visão Geral</div>
        <div className="overview-top-actions">
          <button className="overview-icon-button" title="Buscar"><Search size={18} /></button>
          <button className="overview-icon-button" title="Notificações"><Bell size={18} /><span className="overview-notification">2</span></button>
          <div className="overview-profile"><span className="overview-profile-avatar">{initials}</span><span>{userName}</span></div>
        </div>
      </div>

      <div className="overview-layout">
        <main className="overview-main">
          <section className="overview-welcome">
            <div>
              <span className="overview-kicker"><Sparkles size={14} /> Central de comando</span>
              <h1>Olá, {userName.split(' ')[0] || 'Gabriel'}! <span>👋</span></h1>
              <p>Seu sistema operacional de IA está pronto para criar, publicar e crescer.</p>
            </div>
            <div className="overview-segmented"><button className="active">Visão Geral</button><button>Atividades</button><button>Desempenho</button></div>
          </section>

          <section className="overview-stats" aria-label="Resumo operacional">
            <StatCard icon={<Bot size={24} />} tone="gold" label="Agentes ativos" value={agents.length} hint={`${runningAgents.length} em execução`} />
            <StatCard icon={<FolderKanban size={24} />} tone="amber" label="Projetos ativos" value={activeProjects.length} hint={`${Math.max(0, projects.length - activeProjects.length)} aguardando`} />
            <StatCard icon={<TrendingUp size={24} />} tone="blue" label="Tarefas hoje" value={todayTasks} hint="Fluxos acompanhados em tempo real" />
            <StatCard icon={<Send size={24} />} tone="green" label="Publicações hoje" value={events.filter((event) => /publica/i.test(event.text)).length} hint="Canais e redes conectados" />
          </section>

          <section className="overview-panel overview-agents-panel">
            <header className="overview-section-heading"><div><h2>Seus agentes</h2><p>Especialistas trabalhando em seus projetos</p></div><button onClick={onOpenProjects}><Plus size={15} /> Novo agente</button></header>
            <div className="overview-agent-grid">
              {agents.slice(0, 5).map((agent, index) => (
                <article className="overview-agent-card" key={agent.id}>
                  <div className={`overview-agent-orb orb-${index % 5}`}><Bot size={29} /></div>
                  <button className="overview-more" aria-label={`Opções de ${agent.name}`}>•••</button>
                  <div className="overview-agent-copy"><h3>{agent.name}</h3><span>{agent.task || 'Pronto para uma nova missão'}</span></div>
                  <div className="overview-agent-status"><i className={agent.status === 'idle' ? 'idle' : ''} />{agent.status === 'idle' ? 'Disponível' : 'Online'}</div>
                  <div className="overview-agent-task"><Code2 size={15} /><span>{agent.task || 'Aguardando instruções'}</span></div>
                </article>
              ))}
              {agents.length === 0 && <EmptyState onClick={onOpenProjects} label="Crie seu primeiro agente" />}
            </div>
          </section>

          <section className="overview-panel overview-projects-panel">
            <header className="overview-section-heading"><div><h2>Projetos ativos</h2><p>O que está movendo o BeeHive agora</p></div><button className="overview-text-button" onClick={onOpenProjects}>Ver todos <ChevronRight size={16} /></button></header>
            <div className="overview-project-grid">
              {projects.slice(0, 3).map((project, index) => {
                const progress = project.workflows?.length ? Math.round(project.workflows.reduce((sum, workflow) => sum + workflow.progress, 0) / project.workflows.length) : 0;
                return <article className="overview-project-card" key={project.id} onClick={onOpenProjects}>
                  <div className="overview-project-head"><span className={`overview-project-icon project-${index % 3}`}>{project.icon || <BriefcaseBusiness size={18} />}</span><div><h3>{project.name}</h3><p>{project.description || 'Projeto BeeHive'}</p></div><span className="overview-project-tag">{project.status === 'active' ? 'Ativo' : project.status}</span></div>
                  <div className="overview-progress-label"><span>Progresso</span><strong>{progress}%</strong></div><div className="overview-progress"><span style={{ width: `${progress}%` }} /></div>
                  <div className="overview-project-footer"><div className="overview-member-stack"><span>BH</span><span>AI</span><span>+{Math.max(0, (project.agents || []).length - 2)}</span></div><span>{project.agents?.length || 0} agentes</span></div>
                </article>;
              })}
              {projects.length === 0 && <EmptyState onClick={onOpenProjects} label="Criar projeto" />}
            </div>
          </section>

          <button className="overview-cowork-bar" onClick={onOpenChat}><MessageSquare size={19} /><span>Pergunte ao Cowork ou dê um comando...</span><kbd>⌘ K</kbd><Send size={19} /></button>
        </main>

        <aside className="overview-right-rail">
          <section className="overview-side-card"><header><h2>Atividades recentes</h2><button>Ver todas</button></header><div className="overview-activity-list">
            {events.slice(0, 5).map((event) => <div className={`overview-activity ${event.type}`} key={event.id}><span>{activityIcon(event.type)}</span><div><strong>{event.text}</strong><small>{event.time} atrás</small></div></div>)}
            {events.length === 0 && <p className="overview-muted">As atividades aparecerão aqui.</p>}
          </div></section>
          <section className="overview-side-card overview-metric-card"><header><div><h2>Métricas</h2><small>Últimos 7 dias</small></div><button>Relatório</button></header><div className="overview-chart"><svg viewBox="0 0 300 120" aria-label="Gráfico de desempenho"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#f6c643" stopOpacity=".32"/><stop offset="1" stopColor="#f6c643" stopOpacity="0"/></linearGradient></defs><path d="M4 95 L42 88 L75 62 L112 82 L150 96 L188 48 L220 76 L258 40 L296 25 L296 120 L4 120Z" fill="url(#chartFill)"/><path d="M4 95 L42 88 L75 62 L112 82 L150 96 L188 48 L220 76 L258 40 L296 25" fill="none" stroke="#f6c643" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div><div className="overview-metric-summary"><Metric label="Visualizações" value="—"/><Metric label="Engajamento" value="—"/><Metric label="Receita" value="—"/></div></section>
          <section className="overview-side-card overview-system-card"><h2>Status do sistema</h2><p>Operação monitorada em tempo real</p><div className="overview-system-body"><div className="overview-health"><strong>100%</strong><span>online</span></div><ul><li><CheckCircle2 size={14} /> Kernel <b>Online</b></li><li><CheckCircle2 size={14} /> Workflows <b>Online</b></li><li><CheckCircle2 size={14} /> Banco de dados <b>Online</b></li><li><CheckCircle2 size={14} /> Conexões <b>Online</b></li></ul></div><button className="overview-connect" onClick={onOpenBusiness}><Network size={15} /> Gerenciar conexões</button></section>
        </aside>
      </div>
    </section>
  );
}

function StatCard({ icon, tone, label, value, hint }: { icon: React.ReactNode; tone: string; label: string; value: number; hint: string }) { return <article className={`overview-stat-card ${tone}`}><div><span>{label}</span><strong>{value}</strong><small>▲ {hint}</small></div><i>{icon}</i></article>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function EmptyState({ onClick, label }: { onClick: () => void; label: string }) { return <button className="overview-empty" onClick={onClick}><Plus size={18} /> {label}</button>; }
