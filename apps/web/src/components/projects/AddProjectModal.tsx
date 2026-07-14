/**
 * AddProjectModal — modal para criar ou adicionar um projeto no SERVIDOR.
 *
 * O backend roda no Railway (Linux), então os caminhos são paths do container.
 * O modal mostra diretórios existentes no servidor e permite criar novos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../services/projects/projectStore';
import { API_BASE } from '../../lib/api';
import { Icon } from '../common/Icon';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DirEntry {
  name: string;
  path: string;
}

export function AddProjectModal({ isOpen, onClose }: AddProjectModalProps) {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addProject } = useProjectStore();

  const [browseOpen, setBrowseOpen] = useState(false);
  const [currentBrowsePath, setCurrentBrowsePath] = useState('');
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const fetchDirs = useCallback(async (dirPath?: string) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const url = dirPath
        ? `${API_BASE}/projects/browse?path=${encodeURIComponent(dirPath)}`
        : `${API_BASE}/projects/browse`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      setDirs(data.directories || []);
      setCurrentBrowsePath(data.currentPath || '');
    } catch (err) {
      setBrowseError(err instanceof Error ? err.message : 'Erro ao listar pastas');
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (browseOpen) fetchDirs();
  }, [browseOpen, fetchDirs]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;

    setAdding(true);
    setError(null);
    try {
      await addProject(path.trim(), name.trim() || undefined);
      setPath('');
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar projeto');
    } finally {
      setAdding(false);
    }
  };

  const handleDirClick = (dir: DirEntry) => {
    setPath(dir.path);
    setBrowseOpen(false);
    if (!name.trim()) {
      setName(dir.name);
    }
  };

  const handleParentDir = () => {
    const parts = currentBrowsePath.replace(/\\/g, '/').split('/');
    parts.pop();
    const parent = parts.join('/') || '/';
    fetchDirs(parent);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Projeto</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="project-path">Caminho da pasta no servidor</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="project-path"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/app/data/meu-projeto"
                  className="form-input"
                  style={{ flex: 1 }}
                  required
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBrowseOpen(!browseOpen)}
                  title="Navegar pastas do servidor"
                  style={{ padding: '8px 10px', display: 'flex', alignItems: 'center' }}
                >
                  <Icon name="folder" size={18} />
                </button>
              </div>
              <p className="form-hint">
                Caminho absoluto no servidor. Clique na pasta para navegar o filesystem do servidor.
              </p>
            </div>

            {browseOpen && (
              <div className="browse-panel" style={{
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '8px',
                maxHeight: '250px',
                overflow: 'auto',
                background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
              }}>
                {browseLoading ? (
                  <p style={{ color: 'var(--text-secondary, #888)', fontSize: '0.85rem' }}>Carregando...</p>
                ) : browseError ? (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{browseError}</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary, #888)' }}>
                      <button
                        type="button"
                        onClick={handleParentDir}
                        style={{ background: 'none', border: 'none', color: 'var(--accent, #f59e0b)', cursor: 'pointer', padding: '2px 4px' }}
                      >
                        ..
                      </button>
                      <span style={{ marginLeft: '4px' }}>{currentBrowsePath}</span>
                    </div>
                    {dirs.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary, #888)', fontSize: '0.85rem' }}>Nenhuma subpasta encontrada.</p>
                    ) : (
                      dirs.map((dir) => (
                        <button
                          key={dir.path}
                          type="button"
                          onClick={() => handleDirClick(dir)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '6px 8px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary, #fff)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <Icon name="folder" size={14} />
                          {dir.name}
                        </button>
                      ))
                    )}
                  </>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="project-name">Nome (opcional)</label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meu Projeto"
                className="form-input"
              />
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={adding || !path.trim()}>
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
