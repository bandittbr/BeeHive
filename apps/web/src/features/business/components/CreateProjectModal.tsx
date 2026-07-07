import { useState } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import type { NewProjectInput } from '../useBusiness';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
}

/** Formulário de criação de um Projeto de negócio. */
export function CreateProjectModal({ open, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');

  const canCreate = name.trim().length > 0 && niche.trim().length > 0;

  const reset = () => {
    setName('');
    setNiche('');
    setBrand('');
    setDescription('');
  };

  const submit = () => {
    if (!canCreate) return;
    onCreate({ name, niche, brand, description });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Novo Projeto"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canCreate}>
            Criar Projeto
          </Button>
        </>
      }
    >
      <div className="project-form">
        <Input
          label="Nome do negócio"
          placeholder="Ex.: Café Premium"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Nicho"
          placeholder="Ex.: cafés especiais para escritório"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
        />
        <Input
          label="Marca / tom de voz (opcional)"
          placeholder="Ex.: sofisticado e acolhedor"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <label className="project-form__field">
          <span className="project-form__label">Descrição (opcional)</span>
          <textarea
            className="project-form__textarea"
            rows={3}
            placeholder="Um resumo do negócio, objetivos..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}
