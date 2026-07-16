// Control Center Layout — conectado ao Kernel via BeeHive Bridge
import { useState, useEffect, useCallback } from 'react';
import { BeeHiveBridge } from '../../services/beehive-bridge';
import { ControlCenterService } from '../../services/control-center-service';

// Singleton bridge + service
const bridge = new BeeHiveBridge();
let service: ControlCenterService | null = null;

export function initControlCenter(kernel: any, providerRegistry: any) {
  bridge.setKernel(kernel);
  bridge.setProviderRegistry(providerRegistry);
  service = new ControlCenterService(bridge);
  return service;
}

export function useControlCenter() {
  if (!service) {
    throw new Error('Control Center não inicializado. Chame initControlCenter(kernel, providerRegistry) primeiro.');
  }
  return service;
}

const SECTIONS = [
  { id: 'general' as const, label: 'General', icon: '⚙' },
  { id: 'profile' as const, label: 'Profile', icon: '👤' },
  { id: 'memory' as const, label: 'Memory', icon: '🧠' },
  { id: 'models' as const, label: 'Models', icon: '🤖' },
  { id: 'chat' as const, label: 'Chat', icon: '💬' },
  { id: 'agents' as const, label: 'Agents', icon: '👥' },
  { id: 'skills' as const, label: 'Skills', icon: '🛠' },
  { id: 'permissions' as const, label: 'Permissions', icon: '🔒' },
  { id: 'keyboard' as const, label: 'Keyboard', icon: '⌨' },
  { id: 'archived' as const, label: 'Archived', icon: '📦' },
  { id: 'system' as const, label: 'System', icon: '🖥' },
];

export function ControlCenter() {
  const [activeSection, setActiveSection] = useState('general');
  const svc = useControlCenter();

  // Carregar dados de cada seção
  const [general, setGeneral] = useState(svc.getGeneral());
  const [profile, setProfile] = useState(svc.getProfile());
  const [memory, setMemory] = useState(svc.getMemory());
  const [models, setModels] = useState(svc.getModels());
  const [chat, setChat] = useState(svc.getChat());
  const [agents, setAgents] = useState(svc.getAgents());
  const [skills, setSkills] = useState(svc.getSkills());
  const [permissions, setPermissions] = useState(svc.getPermissions());
  const [system, setSystem] = useState(svc.getSystem());

  // Recarregar quando o serviço notificar mudanças
  const refresh = useCallback(() => {
    setGeneral(svc.getGeneral());
    setProfile(svc.getProfile());
    setMemory(svc.getMemory());
    setModels(svc.getModels());
    setChat(svc.getChat());
    setAgents(svc.getAgents());
    setSkills(svc.getSkills());
    setPermissions(svc.getPermissions());
    setSystem(svc.getSystem());
  }, [svc]);

  useEffect(() => {
    return svc.subscribe(refresh);
  }, [svc, refresh]);

  return (
    <div className="control-center">
      <aside className="control-center-sidebar">
        <h2 className="control-center-title">Control Center</h2>
        <nav>
          {SECTIONS.map(section => (
            <button
              key={section.id}
              className={`control-center-nav-item${activeSection === section.id ? ' active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="control-center-icon">{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="control-center-panel">
        {renderSection(activeSection, { general, profile, memory, models, chat, agents, skills, permissions, system })}
      </main>
    </div>
  );
}

function renderSection(section: string, data: any) {
  switch (section) {
    case 'general': return <GeneralSection data={data.general} onSave={(updates) => useControlCenter().updateGeneral(updates)} />;
    case 'profile': return <ProfileSection data={data.profile} onSave={(updates) => useControlCenter().updateProfile(updates)} />;
    case 'memory': return <MemorySection data={data.memory} onSave={(updates) => useControlCenter().updateMemory(updates)} />;
    case 'models': return <ModelsSection data={data.models} onSave={(updates) => useControlCenter().updateModels(updates)} />;
    case 'chat': return <ChatSection data={data.chat} onSave={(updates) => useControlCenter().updateChat(updates)} />;
    case 'agents': return <AgentsSection data={data.agents} />;
    case 'skills': return <SkillsSection data={data.skills} />;
    case 'permissions': return <PermissionsSection data={data.permissions} onSave={(updates) => useControlCenter().updatePermissions(updates)} />;
    case 'keyboard': return <KeyboardSection />;
    case 'archived': return <ArchivedSection />;
    case 'system': return <SystemSection data={data.system} />;
    default: return <div>Unknown section</div>;
  }
}

// --- Section Components ---

function GeneralSection({ data, onSave }: { data: any; onSave: (u: any) => void }) {
  return (
    <div className="section">
      <h3>General</h3>
      <div className="form-group">
        <label>Theme</label>
        <select defaultValue={data.theme} onChange={e => onSave({ theme: e.target.value as any })}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      <div className="form-group">
        <label>Language</label>
        <select defaultValue={data.language} onChange={e => onSave({ language: e.target.value })}>
          <option value="pt-BR">Português (BR)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>
      <div className="form-group">
        <label>Startup</label>
        <select defaultValue={data.startup} onChange={e => onSave({ startup: e.target.value as any })}>
          <option value="last-session">Last session</option>
          <option value="dashboard">Dashboard</option>
          <option value="default-agent">Default agent</option>
        </select>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.notifications} onChange={e => onSave({ notifications: e.target.checked })} />
          <span>Notifications</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.autoUpdates} onChange={e => onSave({ autoUpdates: e.target.checked })} />
          <span>Auto Updates</span>
        </label>
      </div>
    </div>
  );
}

function ProfileSection({ data, onSave }: { data: any; onSave: (u: any) => void }) {
  return (
    <div className="section">
      <h3>Profile</h3>
      <div className="form-group">
        <label>Name</label>
        <input type="text" value={data.name} onChange={e => onSave({ name: e.target.value })} placeholder="Your name" />
      </div>
      <div className="form-group">
        <label>Timezone</label>
        <input type="text" value={data.timezone} readOnly />
      </div>
      <div className="form-group">
        <label>AI Nickname</label>
        <input type="text" value={data.aiNickname} onChange={e => onSave({ aiNickname: e.target.value })} placeholder="How should the AI call you?" />
      </div>
      <div className="form-group">
        <label>Primary Goal</label>
        <textarea value={data.primaryGoal} onChange={e => onSave({ primaryGoal: e.target.value })} placeholder="What are you building?" rows={3} />
      </div>
    </div>
  );
}

function MemorySection({ data, onSave }: { data: any; onSave: (u: any) => void }) {
  const cats = data.categories || {};
  return (
    <div className="section">
      <h3>Memory</h3>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.enabled} onChange={e => onSave({ enabled: e.target.checked })} />
          <span>Enable memory</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.autoSave} onChange={e => onSave({ autoSave: e.target.checked })} />
          <span>Auto-save memories</span>
        </label>
      </div>
      <h4>Categories</h4>
      {Object.entries(cats).map(([key, value]) => (
        <div key={key} className="form-group">
          <label className="toggle">
            <input type="checkbox" checked={!!value} onChange={e => onSave({ categories: { ...cats, [key]: e.target.checked } })} />
            <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
          </label>
        </div>
      ))}
      <div className="form-group">
        <label>Max memories</label>
        <input type="number" value={data.maxSize} min={100} max={10000} onChange={e => onSave({ maxSize: parseInt(e.target.value) || 1000 })} />
      </div>
    </div>
  );
}

function ModelsSection({ data, onSave }: { data: any; onSave: (u: any) => void }) {
  const renderModel = (label: string, config: any) => (
    <div className="model-card">
      <h4>{label}</h4>
      <div className="form-group">
        <label>Provider</label>
        <select defaultValue={config.provider} onChange={e => onSave({ [label.toLowerCase()]: { ...config, provider: e.target.value } })}>
          <option value="mock">Mock</option>
          <option value="openrouter">OpenRouter</option>
          <option value="ollama">Ollama</option>
        </select>
      </div>
      <div className="form-group">
        <label>Model</label>
        <input type="text" defaultValue={config.model} />
      </div>
      <div className="form-group">
        <label>Status</label>
        <span className={`status-badge ${config.status}`}>{config.status}</span>
      </div>
    </div>
  );

  return (
    <div className="section">
      <h3>Models</h3>
      <div className="model-grid">
        {renderModel('Chat', data.chat)}
        {renderModel('Coding', data.coding)}
        {renderModel('Embeddings', data.embeddings)}
      </div>
    </div>
  );
}

function ChatSection({ data, onSave }: { data: any; onSave: (u: any) => void }) {
  return (
    <div className="section">
      <h3>Chat</h3>
      <div className="form-group">
        <label>Temperature: {data.temperature}</label>
        <input type="range" min={0} max={2} step={0.1} value={data.temperature} onChange={e => onSave({ temperature: parseFloat(e.target.value) })} />
      </div>
      <div className="form-group">
        <label>Response Length</label>
        <select defaultValue={data.responseLength} onChange={e => onSave({ responseLength: e.target.value as any })}>
          <option value="short">Short</option>
          <option value="normal">Normal</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.streaming} onChange={e => onSave({ streaming: e.target.checked })} />
          <span>Streaming</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.showReasoning} onChange={e => onSave({ showReasoning: e.target.checked })} />
          <span>Show reasoning</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" checked={data.saveConversations} onChange={e => onSave({ saveConversations: e.target.checked })} />
          <span>Save conversations</span>
        </label>
      </div>
    </div>
  );
}

function AgentsSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>Agents</h3>
      <div className="form-group">
        <label>Default Agent</label>
        <select defaultValue={data.defaultAgent}>
          {data.available?.map((a: any) => (
            <option key={a.name} value={a.name}>{a.name}</option>
          ))}
        </select>
      </div>
      <h4>Available Agents</h4>
      {data.available?.map((agent: any) => (
        <div key={agent.name} className="agent-card">
          <strong>{agent.name}</strong>
          <p>Personality: {agent.personality}</p>
          <p>Tools: {agent.tools?.join(', ') || 'None'}</p>
          <p>Memory: {agent.memory ? 'On' : 'Off'}</p>
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>Skills</h3>
      {data.items?.map((skill: any) => (
        <div key={skill.id} className="skill-card">
          <label className="toggle">
            <input type="checkbox" defaultChecked={skill.enabled} />
            <span>{skill.name}</span>
          </label>
          <div className="skill-details">
            <small>Capabilities: {skill.capabilities?.join(', ')}</small>
            <small>Plugins: {skill.plugins?.join(', ')}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function PermissionsSection({ data, onSave }: { data: any; onSave: (u: any) => void }) {
  const renderPerm = (label: string, config: any) => (
    <div className="form-group">
      <label>{label}</label>
      <select defaultValue={config.action} onChange={e => onSave({ [config.resource]: { ...config, action: e.target.value as any } })}>
        <option value="allow">Allow</option>
        <option value="ask">Ask every time</option>
        <option value="deny">Deny</option>
      </select>
    </div>
  );

  return (
    <div className="section">
      <h3>Permissions</h3>
      {renderPerm('Browser', data.browser)}
      {renderPerm('Files', data.files)}
      {renderPerm('Location', data.location)}
      {renderPerm('External APIs', data.externalApis)}
    </div>
  );
}

function KeyboardSection() {
  const shortcuts = [
    { key: 'Ctrl+Space', description: 'Open BeeHive' },
    { key: 'Ctrl+K', description: 'New conversation' },
    { key: 'Ctrl+Shift+P', description: 'Command palette' },
  ];

  return (
    <div className="section">
      <h3>Keyboard Shortcuts</h3>
      {shortcuts.map(s => (
        <div key={s.key} className="shortcut-row">
          <kbd>{s.key}</kbd>
          <span>{s.description}</span>
        </div>
      ))}
    </div>
  );
}

function ArchivedSection() {
  return (
    <div className="section">
      <h3>Archived</h3>
      <p className="placeholder-text">No archived items yet.</p>
    </div>
  );
}

function SystemSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>System</h3>
      <div className="system-status">
        <div className="status-item">
          <span>Runtime:</span>
          <span className={data.runtimeOnline ? 'green' : 'red'}>
            {data.runtimeOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="status-item">
          <span>Plugins:</span>
          <span>{data.pluginsLoaded} loaded</span>
        </div>
        <div className="status-item">
          <span>Providers:</span>
          <span>{data.providersAvailable} available</span>
        </div>
        <div className="status-item">
          <span>Storage:</span>
          <span>{data.storageUsed}</span>
        </div>
      </div>
    </div>
  );
}
