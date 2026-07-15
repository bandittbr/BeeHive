/**
 * AddProjectModal — abre pasta LOCAL do PC via File System Access API.
 *
 * O navegador (Chrome/Edge) abre um seletor nativo de pastas. O usuario
 * escolhe uma pasta, o app ganha permissão de leitura/escrita, e os
 * arquivos ficam disponíveis para a AI editar via browser.
 *
 * Requer Chrome 86+ ou Edge 86+. Firefox/Safari: fallback manual.
 */

import React, { useState, useRef } from 'react';
import { Icon } from '../common/Icon';
import { projectFiles } from '@/services/files/projectFiles';
import { useProjectStore } from '@/services/projects/projectStore';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded?: () => void;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function AddProjectModal({ isOpen, onClose, onProjectAdded }: AddProjectModalProps) {
  const { registerLocalProject } = useProjectStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);

  if (!isOpen) return null;

  const supportsFSAPI = typeof window !== 'undefined' && !!window.showDirectoryPicker;

  const handlePickFolder = async () => {
    if (!window.showDirectoryPicker) {
      setError('Seu navegador não suporta File System Access API. Use Chrome ou Edge.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      handleRef.current = handle;
      setSelectedPath(handle.name);
      if (!name.trim()) setName(handle.name);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Usuario cancelou — nao mostra erro
        return;
      }
      setError(err?.message ?? 'Erro ao abrir pasta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const handle = handleRef.current;
      const projectName = name.trim() || handle.name;

      // Verifica permissão
      const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        setError('Permissão de leitura/escrita negada.');
        setLoading(false);
        return;
      }

      const id = `local_${Date.now()}`;
      const now = Date.now();

      // Salva o projeto no IndexedDB
      await projectFiles.saveProject({
        id,
        name: projectName,
        handle,
        mode: 'local',
        createdAt: now,
      });

      // Registra no store para aparecer na UI
      registerLocalProject({
        id,
        name: projectName,
        path: `local://${projectName}`,
        createdAt: now,
        lastAccessedAt: now,
        pinned: false,
        mode: 'local',
      });

      setSelectedPath(null);
      setName('');
      handleRef.current = null;
      onProjectAdded?.();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPath(null);
    setName('');
    handleRef.current = null;
    setError(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Adicionar Projeto</h2>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!supportsFSAPI ? (
              <div className="form-error" style={{ marginBottom: 12 }}>
                Seu navegador não suporta acesso a arquivos locais.
                Use <strong>Chrome</strong> ou <strong>Edge</strong>.
              </div>
            ) : (
              <div className="form-group">
                <label>Pasta do projeto</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div
                    className="addproject__folder-display"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-panel)',
                      color: selectedPath ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedPath ? (
                      <><Icon name="folder" size={14} /> {selectedPath}</>
                    ) : (
                      'Nenhuma pasta selecionada'
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePickFolder}
                    disabled={loading}
                    style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  >
                    <Icon name="folder" size={16} />
                    {selectedPath ? 'Trocar' : 'Selecionar'}
                  </button>
                </div>
                <p className="form-hint">
                  O navegador vai abrir o seletor de pastas do seu PC.
                  A IA poderá ler e editar os arquivos dessa pasta.
                </p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="project-name">Nome do projeto</label>
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
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !handleRef.current}
            >
              {loading ? 'Salvando...' : 'Adicionar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
