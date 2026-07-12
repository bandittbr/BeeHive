/**
 * AddProjectModal — modal para adicionar um diretório local como projeto.
 */

import React, { useState } from 'react';
import { useProjectStore } from '../../services/projects/projectStore';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddProjectModal({ isOpen, onClose }: AddProjectModalProps) {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addProject } = useProjectStore();

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
              <label htmlFor="project-path">Caminho da pasta</label>
              <input
                id="project-path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:/Users/MeuProjeto"
                className="form-input"
                required
              />
              <p className="form-hint">
                Caminho absoluto para o diretório no seu computador.
              </p>
            </div>
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
