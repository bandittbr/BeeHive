/**
 * AddProjectModal — modal para adicionar um diretorio local como projeto.
 *
 * Usa <input webkitdirectory> para abrir o seletor nativo de pastas do SO.
 * O browser nao expoe o path completo por seguranca, entao o usuario
 * ainda precisa digitar o path manualmente — mas o nome da pasta eh
 * preenchido automaticamente.
 */

import React, { useRef, useState } from 'react';
import { useProjectStore } from '../../services/projects/projectStore';
import { Icon } from '../common/Icon';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFolderPick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const relativePath = firstFile.webkitRelativePath || '';
    const folderName = relativePath.split('/')[0] || '';

    if (folderName && !name.trim()) {
      setName(folderName);
    }

    e.target.value = '';
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="project-path"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="C:/Users/MeuProjeto"
                  className="form-input"
                  style={{ flex: 1 }}
                  required
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  // @ts-ignore — webkitdirectory eh propriedade nao padronizada
                  webkitdirectory=""
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleFolderPick}
                  title="Selecionar pasta do PC"
                  style={{ padding: '8px 10px', display: 'flex', alignItems: 'center' }}
                >
                  <Icon name="folder" size={18} />
                </button>
              </div>
              <p className="form-hint">
                Digite o caminho completo ou clique na pasta para selecionar.
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
