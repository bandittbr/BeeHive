import { useState } from 'react';
import { AreaPage } from '@/components/area/AreaPage';
import { Panel } from '@/components/ui';
import { AIProvidersSettings } from './components/AIProvidersSettings';
import './SettingsView.css';

type SettingsTab = 'general' | 'ai-providers';

/**
 * Área Configurações — navegação entre categorias.
 */
export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <AreaPage
      icon="gear"
      title="Configurações"
      description="Preferências do BeeHive e personalização."
      state="Ativo"
    >
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <button 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            Geral
          </button>
          <button 
            className={`settings-tab ${activeTab === 'ai-providers' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-providers')}
          >
            Ai Providers
          </button>
        </aside>
        
        <main className="settings-content">
          {activeTab === 'general' && (
            <Panel title="Configurações Gerais">
              <div className="settings__general-info">
                <p>BeeHive v1.0 — Seu assistente AI pessoal.</p>
              </div>
            </Panel>
          )}
          
          {activeTab === 'ai-providers' && <AIProvidersSettings />}
        </main>
      </div>
    </AreaPage>
  );
}
