import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import type { BusinessModule } from '../../types';

const modules: BusinessModule[] = [
  { id: 'agents', name: 'Agentes', icon: '\u{1F916}', description: 'Gerenciar agentes de IA', category: 'ia' },
  { id: 'skills', name: 'Skills', icon: '\u26A1', description: 'Capacidades e plugins', category: 'ia' },
  { id: 'workflows', name: 'Workflows', icon: '\u2699\uFE0F', description: 'Automação de processos', category: 'automacao' },
  { id: 'memory', name: 'Memory', icon: '\u{1F9E0}', description: 'Base de conhecimento', category: 'ia' },
  { id: 'browser', name: 'Browser', icon: '\u{1F310}', description: 'Navegação e scraping', category: 'ia' },
  { id: 'artifacts', name: 'Artifacts', icon: '\u{1F4E6}', description: 'Arquivos gerados', category: 'conteudo' },
  { id: 'knowledge', name: 'Knowledge Base', icon: '\u{1F4DA}', description: 'Documentos e dados', category: 'ia' },
  { id: 'analytics', name: 'Analytics', icon: '\u{1F4CA}', description: 'Métricas e relatórios', category: 'business' },
  { id: 'coding', name: 'Coding', icon: '\u{1F4BB}', description: 'Geração de código', category: 'dev' },
  { id: 'image', name: 'Image', icon: '\u{1F3A8}', description: 'Geração de imagens', category: 'conteudo' },
  { id: 'video', name: 'Video', icon: '\u{1F3AC}', description: 'Geração de vídeos', category: 'conteudo' },
  { id: 'audio', name: 'Audio', icon: '\u{1F399}\uFE0F', description: 'Geração de áudio', category: 'conteudo' },
  { id: 'instagram', name: 'Instagram', icon: '\u{1F4F8}', description: 'Automação Instagram', category: 'marketing' },
  { id: 'tiktok', name: 'TikTok', icon: '\u{1F3B5}', description: 'Automação TikTok', category: 'marketing' },
  { id: 'youtube', name: 'YouTube', icon: '\u{1F4FA}', description: 'Automação YouTube', category: 'marketing' },
  { id: 'finance', name: 'Finance', icon: '\u{1F4B0}', description: 'Gestão financeira', category: 'business' },
  { id: 'marketing', name: 'Marketing', icon: '\u{1F4E2}', description: 'Campanhas e SEO', category: 'marketing' },
];

const categoryLabels: Record<string, string> = {
  ia: 'IA',
  conteudo: 'Conteúdo',
  automacao: 'Automação',
  marketing: 'Marketing',
  business: 'Business',
  dev: 'Desenvolvimento',
};

const categoryOrder = ['ia', 'conteudo', 'automacao', 'marketing', 'business', 'dev'];

export default function NegociosPage() {
  const navigate = useNavigate();

  const grouped = categoryOrder
    .map(cat => ({ category: cat, label: categoryLabels[cat], items: modules.filter(m => m.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Negócios</h1>
      </div>

      {grouped.map(group => (
        <div key={group.category} className="business-category">
          <h2 className="business-category-title">{group.label}</h2>
          <div className="business-grid">
            {group.items.map(mod => (
              <button key={mod.id} className="business-module-card" onClick={() => navigate("/negocios/" + mod.id)}>
                <span className="business-module-icon">{mod.icon}</span>
                <div className="business-module-info">
                  <span className="business-module-name">{mod.name}</span>
                  <span className="business-module-desc">{mod.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
