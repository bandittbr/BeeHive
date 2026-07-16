import { useState, useEffect, useCallback } from 'react';

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

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [artifactsOpen, setArtifactsOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('general');
  const [general, setGeneral] = useState({ theme: 'dark' as const, language: 'pt-BR', startup: 'dashboard' as const, notifications: true, autoUpdates: true });

  const currentLabel = SECTIONS.find(s => s.id === activeSection)?.label || '';

  return (
    <>
      <style>{CSS}</style>
      <div className={`control-center${!sidebarOpen ? ' sidebar-collapsed' : ''}`}>
        <aside className="control-center-sidebar">
          <div className="sidebar-header">
            <span className="control-center-title">BeeHive</span>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>◀</button>
          </div>
          <nav className="sidebar-nav">
            {SECTIONS.map(section => (
              <button key={section.id} className={`nav-item${activeSection === section.id ? ' active' : ''}`} onClick={() => setActiveSection(section.id)}>
                <span className="icon">{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        {!sidebarOpen && <button className="sidebar-expand" onClick={() => setSidebarOpen(true)}>▶</button>}
        <div className="control-center-panel">
          <div className="panel-toolbar">
            <span className="panel-title">{currentLabel}</span>
            <div className="panel-actions">
              <button className="panel-btn" onClick={() => setArtifactsOpen(!artifactsOpen)}>
                {artifactsOpen ? 'Hide Artifacts' : 'Show Artifacts'}
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div className="section">
              <h3>General</h3>
              <div className="form-group"><label>Theme</label>
                <select value={general.theme} onChange={e => setGeneral({...general, theme: e.target.value as any})}>
                  <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
                </select>
              </div>
              <div className="form-group"><label>Language</label>
                <select value={general.language} onChange={e => setGeneral({...general, language: e.target.value})}>
                  <option value="pt-BR">Português (BR)</option><option value="en-US">English (US)</option>
                </select>
              </div>
              <div className="form-group"><label>Startup</label>
                <select value={general.startup} onChange={e => setGeneral({...general, startup: e.target.value as any})}>
                  <option value="last-session">Last session</option><option value="dashboard">Dashboard</option><option value="default-agent">Default agent</option>
                </select>
              </div>
              <div className="form-group"><label className="toggle"><input type="checkbox" checked={general.notifications} onChange={e => setGeneral({...general, notifications: e.target.checked})} /><span>Notifications</span></label></div>
              <div className="form-group"><label className="toggle"><input type="checkbox" checked={general.autoUpdates} onChange={e => setGeneral({...general, autoUpdates: e.target.checked})} /><span>Auto Updates</span></label></div>
            </div>
          </div>
        </div>
        <div className={`artifacts-panel${!artifactsOpen ? ' collapsed' : ''}`}>
          <div className="artifacts-header">
            <span className="artifacts-title">Artifacts</span>
            <button className="artifacts-close" onClick={() => setArtifactsOpen(false)}>✕</button>
          </div>
          <div className="artifacts-body"><p className="placeholder-text">Run a workflow to see artifacts here.</p></div>
        </div>
      </div>
    </>
  );
}

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0a0a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; }
.control-center { display: flex; height: 100vh; background: #0a0a0a; color: #e0e0e0; overflow: hidden; }
.control-center-sidebar { width: 220px; min-width: 220px; background: #111; border-right: 1px solid #1e1e1e; display: flex; flex-direction: column; transition: all 0.25s ease; overflow: hidden; flex-shrink: 0; }
.sidebar-collapsed .control-center-sidebar { width: 0; min-width: 0; opacity: 0; border-right: none; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px; }
.control-center-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #666; }
.sidebar-toggle { background: none; border: none; color: #666; cursor: pointer; font-size: 14px; padding: 4px; border-radius: 4px; transition: color 0.15s; }
.sidebar-toggle:hover { color: #e0e0e0; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 0 8px; }
.sidebar-nav::-webkit-scrollbar { width: 0; }
.nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 12px; margin-bottom: 1px; border: none; background: transparent; color: #666; cursor: pointer; border-radius: 8px; font-size: 13px; text-align: left; transition: all 0.15s ease; white-space: nowrap; }
.nav-item:hover { background: #1a1a1a; color: #e0e0e0; }
.nav-item.active { background: #161616; color: #e0e0e0; }
.nav-item .icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
.sidebar-expand { position: fixed; top: 12px; left: 8px; background: #111; border: 1px solid #1e1e1e; color: #666; cursor: pointer; padding: 8px 10px; border-radius: 8px; font-size: 14px; z-index: 100; transition: all 0.15s; }
.sidebar-expand:hover { color: #e0e0e0; border-color: #4fc3f7; }
.control-center-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.panel-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid #1e1e1e; flex-shrink: 0; }
.panel-title { font-size: 15px; font-weight: 500; }
.panel-actions { display: flex; gap: 8px; }
.panel-btn { background: none; border: 1px solid #1e1e1e; color: #666; cursor: pointer; padding: 4px 10px; border-radius: 8px; font-size: 12px; transition: all 0.15s; }
.panel-btn:hover { border-color: #666; color: #e0e0e0; }
.panel-body { flex: 1; overflow-y: auto; padding: 24px 32px; }
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
.section h3 { font-size: 13px; font-weight: 500; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #1e1e1e; }
.section h4 { font-size: 12px; font-weight: 500; color: #666; margin: 20px 0 10px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 11px; font-weight: 500; margin-bottom: 6px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
.form-group select, .form-group input[type="text"], .form-group input[type="number"], .form-group textarea { width: 100%; padding: 8px 12px; background: #0a0a0a; border: 1px solid #1e1e1e; border-radius: 8px; color: #e0e0e0; font-size: 13px; font-family: inherit; transition: border-color 0.15s; }
.form-group select:focus, .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #4fc3f7; }
.form-group input[type="range"] { padding: 4px 0; -webkit-appearance: none; background: transparent; border: none; }
.form-group input[type="range"]::-webkit-slider-track { height: 4px; background: #1e1e1e; border-radius: 2px; }
.form-group input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #4fc3f7; border-radius: 50%; margin-top: -5px; cursor: pointer; }
.form-group .range-value { display: inline-block; margin-left: 12px; font-size: 12px; color: #666; }
.toggle { display: flex !important; align-items: center; gap: 10px; cursor: pointer; padding: 6px 0; }
.toggle input[type="checkbox"] { accent-color: #4fc3f7; width: 14px; height: 14px; cursor: pointer; }
.model-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.model-card { background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px; padding: 14px; }
.model-card h4 { margin: 0 0 12px; font-size: 12px; color: #e0e0e0; text-transform: none; letter-spacing: 0; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.status-badge.active { background: rgba(76,175,80,0.15); color: #4caf50; }
.status-badge.inactive { background: rgba(255,152,0,0.15); color: #ff9800; }
.skill-card, .agent-card { background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; }
.skill-details { margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.shortcut-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #1e1e1e; }
.shortcut-row:last-child { border-bottom: none; }
.shortcut-row kbd { background: #0f0f0f; border: 1px solid #1e1e1e; border-radius: 4px; padding: 3px 8px; font-family: 'SF Mono', monospace; font-size: 11px; color: #666; }
.system-status .status-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1e1e1e; font-size: 12px; }
.system-status .status-item:last-child { border-bottom: none; }
.green { color: #4caf50; }
.red { color: #f44336; }
.placeholder-text { color: #666; font-size: 12px; padding: 20px 0; }
.agent-card p { font-size: 12px; color: #666; margin: 2px 0; }
.artifacts-panel { width: 320px; border-left: 1px solid #1e1e1e; background: #0f0f0f; display: flex; flex-direction: column; transition: all 0.25s ease; overflow: hidden; flex-shrink: 0; }
.artifacts-panel.collapsed { width: 0; min-width: 0; border-left: none; opacity: 0; }
.artifacts-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #1e1e1e; flex-shrink: 0; }
.artifacts-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #666; }
.artifacts-close { background: none; border: none; color: #666; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 4px; transition: color 0.15s; }
.artifacts-close:hover { color: #e0e0e0; }
.artifacts-body { flex: 1; padding: 16px; overflow-y: auto; }
.sidebar-collapsed .nav-item span:not(.icon) { display: none; }
`;
