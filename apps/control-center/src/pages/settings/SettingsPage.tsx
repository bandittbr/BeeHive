import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { User, Cpu, Box, Puzzle, ScrollText, Palette } from 'lucide-react';

const MENU = [
  { to: '/settings/profile', label: 'Profile', icon: User },
  { to: '/settings/providers', label: 'Providers', icon: Cpu },
  { to: '/settings/models', label: 'Models', icon: Box },
  { to: '/settings/plugins', label: 'Plugins', icon: Puzzle },
  { to: '/settings/logs', label: 'Logs', icon: ScrollText },
  { to: '/settings/theme', label: 'Theme', icon: Palette },
];

export default function SettingsPage() {
  const location = useLocation();
  const isRoot = location.pathname === '/settings' || location.pathname === '/settings/';

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Settings</h1>
      </header>
      <div className="content-scroll">
        <div style={{ display: 'flex', gap: 16 }}>
          <aside
            style={{
              width: 200,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 12,
              alignSelf: 'flex-start',
            }}
          >
            {MENU.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' active' : ''}`
                }
                style={{ width: '100%' }}
              >
                <item.icon size={16} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isRoot ? (
              <div className="chat-panel">
                <div className="chat-empty">
                  <h3 style={{ color: 'var(--text)' }}>Selecione uma opção</h3>
                  <p>Escolha uma categoria no menu ao lado para configurar.</p>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
