import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit3, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { projectService } from '../../services/project.service';
import type { Project } from '../../types';

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'status-active' },
  paused: { label: 'Paused', className: 'status-paused' },
  completed: { label: 'Completed', className: 'status-completed' },
};

const agentStatusIcon: Record<string, typeof Loader2> = {
  running: Loader2,
  working: Loader2,
  idle: Clock,
  waiting: Clock,
  error: AlertCircle,
};

const workflowStatusConfig: Record<string, { className: string }> = {
  running: { className: 'progress-running' },
  completed: { className: 'progress-completed' },
  error: { className: 'progress-error' },
  scheduled: { className: 'progress-scheduled' },
};

function EditProjectModal({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: project.name, description: project.description, status: project.status });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await projectService.update(project.id, form);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Project</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
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
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = useAppStore(s => s.projects.find(p => p.id === id));
  const [tab, setTab] = useState<"overview" | "agents" | "workflows" | "artifacts">("overview");
  const [showEdit, setShowEdit] = useState(false);

  if (!project) {
    return (
      <div className="page-container">
        <div className="not-found">
          <h2>Project not found</h2>
          <Link to="/projects" className="btn-primary">Back to Projects</Link>
        </div>
      </div>
    );
  }

  const cfg = statusConfig[project.status];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <span className="project-detail-icon">{project.icon}</span>
          <div>
            <h1>{project.name}</h1>
            <span className={"status-badge " + cfg.className}>{cfg.label}</span>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => setShowEdit(true)}>
          <Edit3 size={16} /> Edit
        </button>
      </div>

      <div className="tabs">
        <button className={"tab " + (tab === "overview" ? "active" : "")} onClick={() => setTab("overview")}>Overview</button>
        <button className={"tab " + (tab === "agents" ? "active" : "")} onClick={() => setTab("agents")}>Agents</button>
        <button className={"tab " + (tab === "workflows" ? "active" : "")} onClick={() => setTab("workflows")}>Workflows</button>
        <button className={"tab " + (tab === "artifacts" ? "active" : "")} onClick={() => setTab("artifacts")}>Artifacts</button>
      </div>

      <div className="tab-content">
        {tab === "overview" && (
          <div className="overview-section">
            <p className="project-description">{project.description}</p>
            <div className="dates-row">
              <div className="date-item">
                <span className="date-label">Created</span>
                <span className="date-value">{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="date-item">
                <span className="date-label">Updated</span>
                <span className="date-value">{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {tab === "agents" && (
          <div className="agents-section">
            {project.agents.map(agent => {
              const Icon = agentStatusIcon[agent.status] || Clock;
              return (
                <div key={agent.id} className="agent-row">
                  <Icon size={16} className={"agent-status " + agent.status} />
                  <div className="agent-color" style={{ background: agent.color }} />
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-task">{agent.task}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === "workflows" && (
          <div className="workflows-section">
            {project.workflows.map(wf => (
              <div key={wf.id} className="workflow-row">
                <div className="workflow-info">
                  <span className="workflow-name">{wf.name}</span>
                  <span className={"workflow-status " + (workflowStatusConfig[wf.status]?.className || "")}>{wf.status}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: wf.progress + "%" }} />
                </div>
                <span className="progress-text">{wf.progress}%</span>
              </div>
            ))}
          </div>
        )}

        {tab === "artifacts" && (
          <div className="artifacts-section">
            <table className="artifacts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {project.artifacts.map(art => (
                  <tr key={art.id}>
                    <td>{art.name}</td>
                    <td>{art.type}</td>
                    <td>{art.size}</td>
                    <td>{new Date(art.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEdit && <EditProjectModal project={project} onClose={() => setShowEdit(false)} onSave={() => setShowEdit(false)} />}
    </div>
  );
}
