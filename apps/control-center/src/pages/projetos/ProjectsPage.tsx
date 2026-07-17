import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Edit3, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { projectService } from '../../services/project.service';
import type { Project } from '../../types';

const statusConfig = {
  active: { label: 'Active', className: 'status-active' },
  paused: { label: 'Paused', className: 'status-paused' },
  completed: { label: 'Completed', className: 'status-completed' },
};

interface ProjectFormData {
  name: string;
  icon: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
}

const emptyForm: ProjectFormData = { name: '', icon: '📁', description: '', status: 'active' };

function ProjectModal({ project, onClose, onSave }: { project?: Project | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState<ProjectFormData>(
    project ? { name: project.name, icon: project.icon, description: project.description, status: project.status } : { ...emptyForm }
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (project) {
        await projectService.update(project.id, form);
      } else {
        await projectService.create(form);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" required />
          </div>
          <div className="form-group">
            <label>Icon (emoji)</label>
            <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📁" maxLength={2} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Project description" rows={3} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : project ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>Confirm</h2>
          <button className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <p style={{ padding: '16px 0', color: 'var(--text-secondary)' }}>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useAppStore(s => s.projects);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => { const f = () => setMenuOpen(null); window.addEventListener('click', f); return () => window.removeEventListener('click', f); }, []);

  const refresh = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    await projectService.delete(deletingProject.id);
    setDeletingProject(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Projects</h1>
        <button className="btn-primary" onClick={() => { setEditingProject(null); setShowModal(true); }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="cards-grid">
        {projects.map(project => (
          <div key={project.id} className="card" onClick={() => navigate(`/projects/${project.id}`)}>
            <div className="card-top">
              <span className="card-icon">{project.icon}</span>
              <div className="card-menu-wrapper">
                <button className="card-menu-btn" onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === project.id ? null : project.id); }}>
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen === project.id && (
                  <div className="card-menu-dropdown" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingProject(project); setShowModal(true); setMenuOpen(null); }}>
                      <Edit3 size={14} /> Edit
                    </button>
                    <button onClick={() => { setDeletingProject(project); setMenuOpen(null); }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
            <h3 className="card-title">{project.name}</h3>
            <p className="card-desc">{project.description}</p>
            <span className={`status-badge ${statusConfig[project.status].className}`}>
              {statusConfig[project.status].label}
            </span>
          </div>
        ))}
      </div>

      {showModal && <ProjectModal project={editingProject} onClose={() => { setShowModal(false); setEditingProject(null); }} onSave={refresh} />}
      {deletingProject && <ConfirmDialog message={`Delete "${deletingProject.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeletingProject(null)} />}
    </div>
  );
}
