/**
 * LeadsView — Interface principal do módulo de Leads.
 * Abas: Dashboard | Automação | Scraping | Lista de Leads
 */
import { useState } from 'react';
import {
  BarChart3, Globe, Users, Cpu,
} from 'lucide-react';
import { LeadsDashboard } from './LeadsDashboard';
import { LeadsScraperForm } from './LeadsScraperForm';
import { LeadsList } from './LeadsList';
import { LeadsAutomation } from './LeadsAutomation';

export type TabView = 'dashboard' | 'automation' | 'scraper' | 'leads';

const TAB_CONFIG: { id: TabView; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'automation', label: 'Automação', icon: Cpu },
  { id: 'scraper', label: 'Scraping', icon: Globe },
  { id: 'leads', label: 'Leads', icon: Users },
];

export function LeadsView() {
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [message, setMessage] = useState('');

  const handleScrapeComplete = (_count: number) => {
    setMessage('Scraping iniciado em segundo plano! Os leads aparecerão na lista em alguns minutos.');
    setActiveTab('leads');
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <div className="leads-module">
      {/* Cabeçalho */}
      <div className="leads-header">
        <div className="leads-header-info">
          <h2>Leads</h2>
          <p>Prospecção automatizada de empresas — scraping, segmentação, propostas e conversão</p>
        </div>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className="leads-toast">
          {message}
        </div>
      )}

      {/* Abas */}
      <div className="leads-tabs">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`leads-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div className="leads-content">
        {activeTab === 'dashboard' && (
          <LeadsDashboard onNavigate={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'automation' && (
          <LeadsAutomation />
        )}
        {activeTab === 'scraper' && (
          <LeadsScraperForm
            onComplete={handleScrapeComplete}
            onBack={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'leads' && (
          <LeadsList onNewScrape={() => setActiveTab('scraper')} />
        )}
      </div>
    </div>
  );
}
