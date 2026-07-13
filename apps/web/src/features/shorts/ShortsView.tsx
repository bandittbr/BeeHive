import { useState } from 'react';
import { Button, Card, EmptyState, Modal, Alert, Loading, Badge } from '@/components/ui';
import { Icon } from '@/components/common/Icon';
import { useAgents, type ShortsAgent } from './useShorts';
import { AgentDetailView } from './AgentDetailView';
import { CreateAgentModal } from './CreateAgentModal';
import './ShortsView.css';

export function ShortsView() {
  const { agents, loading, error, createAgent, deleteAgent } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  if (selectedAgent) {
    return (
      <AgentDetailView
        agentId={selectedAgent}
        onBack={() => setSelectedAgent(null)}
      />
    );
  }

  return (
    <div className="shorts">
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="shorts__header">
        <div className="shorts__header-info">
          <h2 className="shorts__title">Cortes Youtube</h2>
          <p className="shorts__subtitle">
            Geratore automático de Shorts a partir de vídeos longos.
            Crie agents, conecte redes sociais e publique automaticamente.
          </p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setShowCreate(true)}>
          Novo Agent
        </Button>
      </div>

      {loading ? (
        <Loading label="Carregando agents..." />
      ) : agents.length === 0 ? (
        <EmptyState
          icon="film"
          title="Nenhum agent criado"
          description="Crie seu primeiro agent pra começar a gerar cortes automáticos do YouTube."
          action={
            <Button variant="primary" icon="plus" onClick={() => setShowCreate(true)}>
              Criar Agent
            </Button>
          }
        />
      ) : (
        <div className="shorts__grid">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={() => setSelectedAgent(agent.id)}
              onDelete={() => setPendingDelete(agent.id)}
            />
          ))}
        </div>
      )}

      <CreateAgentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (data) => {
          const agent = await createAgent(data);
          setSelectedAgent(agent.id);
          setShowCreate(false);
        }}
      />

      <Modal
        open={pendingDelete !== null}
        title="Apagar agent"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (pendingDelete) {
                  await deleteAgent(pendingDelete);
                  if (selectedAgent === pendingDelete) setSelectedAgent(null);
                }
                setPendingDelete(null);
              }}
            >
              Apagar
            </Button>
          </>
        }
      >
        Apagar este agent e todos os seus clipes e publicações? Esta ação não pode ser desfeita.
      </Modal>
    </div>
  );
}

function AgentCard({ agent, onSelect, onDelete }: {
  agent: ShortsAgent;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="shorts__agent-card" interactive onClick={onSelect}>
      <div className="shorts__agent-head">
        <div className="shorts__agent-avatar">
          {agent.avatarUrl ? (
            <img src={agent.avatarUrl} alt={agent.name} />
          ) : (
            <span className="shorts__agent-avatar-placeholder">
              {agent.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="shorts__agent-info">
          <h3 className="shorts__agent-name">{agent.name}</h3>
          {agent.niche && (
            <Badge tone="accent">{agent.niche}</Badge>
          )}
        </div>
        <button
          className="shorts__agent-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Remover agent"
          aria-label="Remover agent"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
      {agent.description && (
        <p className="shorts__agent-desc">{agent.description}</p>
      )}
      <div className="shorts__agent-status">
        <Badge tone={agent.active ? 'success' : 'neutral'} dot>
          {agent.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
    </Card>
  );
}
