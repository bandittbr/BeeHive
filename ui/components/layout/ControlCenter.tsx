// Control Center Layout
// Sidebar com navegação entre seções + painel principal

import { useState } from 'react';
import { ControlCenterService } from '../../services/control-center-service';

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
  const service = new ControlCenterService();
  const state = service.getState();

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
        {renderSection(activeSection, state)}
      </main>
    </div>
  );
}

function renderSection(section: string, state: any) {
  switch (section) {
    case 'general': return <GeneralSection data={state.general} />;
    case 'profile': return <ProfileSection data={state.profile} />;
    case 'memory': return <MemorySection data={state.memory} />;
    case 'models': return <ModelsSection data={state.models} />;
    case 'chat': return <ChatSection data={state.chat} />;
    case 'agents': return <AgentsSection data={state.agents} />;
    case 'skills': return <SkillsSection data={state.skills} />;
    case 'permissions': return <PermissionsSection data={state.permissions} />;
    case 'keyboard': return <KeyboardSection data={state.keyboard} />;
    case 'archived': return <ArchivedSection data={state.archived} />;
    case 'system': return <SystemSection data={state.system} />;
    default: return <div>Unknown section</div>;
  }
}

// --- Section Components ---

function GeneralSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>General</h3>
      <div className="form-group">
        <label>Theme</label>
        <select defaultValue={data.theme}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      <div className="form-group">
        <label>Language</label>
        <select defaultValue={data.language}>
          <option value="pt-BR">Português (BR)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>
      <div className="form-group">
        <label>Startup</label>
        <select defaultValue={data.startup}>
          <option value="last-session">Last session</option>
          <option value="dashboard">Dashboard</option>
          <option value="default-agent">Default agent</option>
        </select>
      </div>
      <div className="form-group">
        <label>Notifications</label>
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.notifications} />
          <span>Enable</span>
        </label>
      </div>
      <div className="form-group">
        <label>Auto Updates</label>
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.autoUpdates} />
          <span>Enable</span>
        </label>
      </div>
    </div>
  );
}

function ProfileSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>Profile</h3>
      <div className="form-group">
        <label>Name</label>
        <input type="text" defaultValue={data.name} placeholder="Your name" />
      </div>
      <div className="form-group">
        <label>Timezone</label>
        <input type="text" defaultValue={data.timezone} readOnly />
      </div>
      <div className="form-group">
        <label>AI Nickname</label>
        <input type="text" defaultValue={data.aiNickname} placeholder="How should the AI call you?" />
      </div>
      <div className="form-group">
        <label>Primary Goal</label>
        <textarea defaultValue={data.primaryGoal} placeholder="What are you building?" rows={3} />
      </div>
    </div>
  );
}

function MemorySection({ data }: { data: any }) {
  const cats = data.categories || {};
  return (
    <div className="section">
      <h3>Memory</h3>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.enabled} />
          <span>Enable memory</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.autoSave} />
          <span>Auto-save memories</span>
        </label>
      </div>
      <h4>Categories</h4>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={cats.preferences} />
          <span>Preferences</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={cats.projects} />
          <span>Projects</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={cats.people} />
          <span>People</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={cats.knowledge} />
          <span>Knowledge</span>
        </label>
      </div>
      <div className="form-group">
        <label>Max memories</label>
        <input type="number" defaultValue={data.maxSize} min={100} max={10000} />
      </div>
    </div>
  );
}

function ModelsSection({ data }: { data: any }) {
  const renderModel = (label: string, config: any) => (
    <div className="model-card">
      <h4>{label}</h4>
      <div className="form-group">
        <label>Provider</label>
        <select defaultValue={config.provider}>
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
        <label>Context Window</label>
        <input type="number" defaultValue={config.contextWindow} readOnly />
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

function ChatSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>Chat</h3>
      <div className="form-group">
        <label>Temperature</label>
        <input type="range" min={0} max={2} step={0.1} defaultValue={data.temperature} />
        <span>{data.temperature}</span>
      </div>
      <div className="form-group">
        <label>Response Length</label>
        <select defaultValue={data.responseLength}>
          <option value="short">Short</option>
          <option value="normal">Normal</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.streaming} />
          <span>Streaming</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.showReasoning} />
          <span>Show reasoning</span>
        </label>
      </div>
      <div className="form-group">
        <label className="toggle">
          <input type="checkbox" defaultChecked={data.saveConversations} />
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

function PermissionsSection({ data }: { data: any }) {
  const renderPerm = (label: string, config: any) => (
    <div className="form-group">
      <label>{label}</label>
      <select defaultValue={config.action}>
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

function KeyboardSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>Keyboard Shortcuts</h3>
      {data.shortcuts?.map((s: any) => (
        <div key={s.key} className="shortcut-row">
          <kbd>{s.key}</kbd>
          <span>{s.description}</span>
        </div>
      ))}
    </div>
  );
}

function ArchivedSection({ data }: { data: any }) {
  return (
    <div className="section">
      <h3>Archived</h3>
      <div className="archive-sections">
        <div><strong>Conversations:</strong> {data.conversations?.length || 0}</div>
        <div><strong>Workflows:</strong> {data.workflows?.length || 0}</div>
        <div><strong>Projects:</strong> {data.projects?.length || 0}</div>
        <div><strong>Artifacts:</strong> {data.artifacts?.length || 0}</div>
      </div>
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
