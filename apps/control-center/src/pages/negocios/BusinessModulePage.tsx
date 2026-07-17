import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  icon: string;
  description: string;
}

const moduleActions: Record<string, { label: string; desc: string }[]> = {
  Agentes: [
    { label: 'Criar Agente', desc: 'Configure um novo agente de IA' },
    { label: 'Gerenciar Skills', desc: 'Atribua habilidades aos agentes' },
    { label: 'Monitorar', desc: 'Acompanhe execuções em tempo real' },
  ],
  Skills: [
    { label: 'Explorar Skills', desc: 'Navegue pelas skills disponíveis' },
    { label: 'Criar Skill', desc: 'Desenvolva uma nova skill' },
    { label: 'Plugins', desc: 'Gerencie plugins instalados' },
  ],
  Workflows: [
    { label: 'Novo Workflow', desc: 'Crie um fluxo de automação' },
    { label: 'Templates', desc: 'Use modelos prontos' },
    { label: 'Histórico', desc: 'Veja execuções anteriores' },
  ],
  Memory: [
    { label: 'Consultar Memória', desc: 'Pesquise na base de conhecimento' },
    { label: 'Vetores', desc: 'Gerencie embeddings' },
    { label: 'Limpeza', desc: 'Mantenha a memória otimizada' },
  ],
  Browser: [
    { label: 'Nova Navegação', desc: 'Inicie uma sessão de navegação' },
    { label: 'Scraping', desc: 'Configure extração de dados' },
    { label: 'Sessões Ativas', desc: 'Gerencie sessões em andamento' },
  ],
  Artifacts: [
    { label: 'Meus Arquivos', desc: 'Visualize todos os artefatos' },
    { label: 'Upload', desc: 'Adicione novos arquivos' },
    { label: 'Compartilhar', desc: 'Compartilhe com outros projetos' },
  ],
  'Knowledge Base': [
    { label: 'Documentos', desc: 'Gerencie sua base documental' },
    { label: 'Importar', desc: 'Importe novos documentos' },
    { label: 'Pesquisar', desc: 'Busque na base de conhecimento' },
  ],
  Analytics: [
    { label: 'Dashboard', desc: 'Visão geral de métricas' },
    { label: 'Relatórios', desc: 'Gere relatórios personalizados' },
    { label: 'Exportar', desc: 'Exporte dados e gráficos' },
  ],
  Coding: [
    { label: 'Novo Projeto', desc: 'Inicie um projeto de código' },
    { label: 'Review', desc: 'Revise código gerado' },
    { label: 'Deploy', desc: 'Publique suas aplicações' },
  ],
  Image: [
    { label: 'Gerar Imagem', desc: 'Crie imagens com IA' },
    { label: 'Galeria', desc: 'Visualize imagens geradas' },
    { label: 'Editar', desc: 'Edite imagens existentes' },
  ],
  Video: [
    { label: 'Gerar Vídeo', desc: 'Crie vídeos com IA' },
    { label: 'Editor', desc: 'Edite vídeos' },
    { label: 'Exportar', desc: 'Exporte em vários formatos' },
  ],
  Audio: [
    { label: 'Gerar Áudio', desc: 'Crie áudio com IA' },
    { label: 'Transcrever', desc: 'Transcreva arquivos de áudio' },
    { label: 'Biblioteca', desc: 'Gerencie sua biblioteca' },
  ],
  Instagram: [
    { label: 'Agendar Post', desc: 'Programe publicações' },
    { label: 'Analytics', desc: 'Métricas do perfil' },
    { label: 'Automação', desc: 'Configure automações' },
  ],
  TikTok: [
    { label: 'Agendar Post', desc: 'Programe publicações' },
    { label: 'Analytics', desc: 'Métricas do perfil' },
    { label: 'Automação', desc: 'Configure automações' },
  ],
  YouTube: [
    { label: 'Upload', desc: 'Publique vídeos' },
    { label: 'Analytics', desc: 'Métricas do canal' },
    { label: 'Comentários', desc: 'Gerencie interações' },
  ],
  Finance: [
    { label: 'Dashboard', desc: 'Visão financeira' },
    { label: 'Transações', desc: 'Histórico de transações' },
    { label: 'Relatórios', desc: 'Relatórios financeiros' },
  ],
  Marketing: [
    { label: 'Campanhas', desc: 'Gerencie campanhas ativas' },
    { label: 'SEO', desc: 'Otimização de busca' },
    { label: 'Relatórios', desc: 'Métricas de marketing' },
  ],
};

export default function BusinessModulePage({ title, icon, description }: Props) {
  const navigate = useNavigate();
  const actions = moduleActions[title] || [
    { label: 'Explorar', desc: 'Navegue pelo módulo' },
    { label: 'Configurar', desc: 'Ajuste as preferências' },
    { label: 'Ajuda', desc: 'Documentação do módulo' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn-icon" onClick={() => navigate('/negocios')}>
            <ArrowLeft size={20} />
          </button>
          <span className="module-page-icon">{icon}</span>
          <div>
            <h1>{title}</h1>
            <p className="module-page-desc">{description}</p>
          </div>
        </div>
      </div>

      <div className="module-placeholder">
        <p>Módulo em desenvolvimento. Conectado ao BeeHive Kernel em breve.</p>
      </div>

      <div className="module-actions">
        <h2>Ações Disponíveis</h2>
        <div className="actions-grid">
          {actions.map(action => (
            <div key={action.label} className="action-card">
              <h3>{action.label}</h3>
              <p>{action.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
