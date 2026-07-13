import { useState, useEffect } from 'react';
import { Button, Modal, Input } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import { API_BASE } from '@/lib/api';

interface FreeModel {
  id: string;
  label: string;
}

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; niche: string; defaultProviderId: string; defaultModel: string }) => void;
}

export function CreateAgentModal({ open, onClose, onCreate }: CreateAgentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [niche, setNiche] = useState('');
  const [model, setModel] = useState('big-pickle');
  const [freeModels, setFreeModels] = useState<FreeModel[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/shorts/free-models`)
      .then((r) => r.json())
      .then((data: FreeModel[]) => setFreeModels(data))
      .catch(() => setFreeModels([]));
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), description, niche, defaultProviderId: '', defaultModel: model });
      setName('');
      setDescription('');
      setNiche('');
      setModel('big-pickle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Novo Agent"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? 'Criando...' : 'Criar Agent'}
          </Button>
        </>
      }
    >
      <div className="shorts__form">
        <div className="form-group">
          <label>Nome do Agent</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: @techcreator"
          />
        </div>
        <div className="form-group">
          <label>Descrição</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Canal de tecnologia e programação"
          />
        </div>
        <div className="form-group">
          <label>Nicho</label>
          <Input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Ex.: tech, finanças, humor, educação"
          />
        </div>
        <div className="form-group">
          <label><Icon name="bolt" size={14} /> Modelo (grátis, sem chave)</label>
          <select
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {freeModels.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
