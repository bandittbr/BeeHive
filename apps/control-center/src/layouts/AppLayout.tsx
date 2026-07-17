import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, FolderOpen, Blocks, Settings } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import '../App.css';

export default function AppLayout() {
  const { projects } = useAppStore();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="nav-logo-mark">🐝</div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <LayoutDashboard size={17} strokeWidth={1.8} />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <MessageSquare size={17} strokeWidth={1.8} />
            <span>Chat</span>
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <FolderOpen size={17} strokeWidth={1.8} />
            <span>Projects</span>
          </NavLink>
          <NavLink
            to="/negocios"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Blocks size={17} strokeWidth={1.8} />
            <span>Negocios</span>
          </NavLink>
        </nav>

        <div className="sidebar-projects">
          {projects.map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}`}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              title={project.name}
            >
              <span>{project.icon}</span>
              <span>{project.name}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Settings size={17} strokeWidth={1.8} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
