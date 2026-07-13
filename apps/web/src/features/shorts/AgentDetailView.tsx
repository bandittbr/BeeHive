import { useState, useEffect, useCallback } from 'react';
import { Button, Card, EmptyState, Alert, Loading, Badge, Input, Panel } from '@/components/ui';
import { Icon, type IconName } from '@/components/common/Icon';
import { API_BASE } from '@/lib/api';
import { useAgents, usePipeline, useMetrics, type AgentDetail, type PipelineJob } from './useShorts';
import { ProviderSelector } from './ProviderSelector';
import { PipelineJobCard } from './PipelineJobCard';
import './AgentDetailView.css';

interface AgentDetailViewProps {
  agentId: string;
  onBack: () => void;
}

const PLATFORM_ICONS: Record<string, IconName> = {
  youtube: 'play',
  tiktok: 'music',
  instagram: 'camera',
};

export function AgentDetailView({ agentId, onBack }: AgentDetailViewProps) {
  const { getAgentDetail } = useAgents();
  const { startJob, getAgentJobs, publishClip } = usePipeline();
  const { getSummary } = useMetrics();

  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New job form
  const [newUrl, setNewUrl] = useState('');
  const [numClips, setNumClips] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  // Free models (OpenCode Zen) para o seletor
  const [freeModels, setFreeModels] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    fetch(`${API_BASE}/shorts/free-models`)
      .then((r) => r.json())
      .then((data: Array<{ id: string; label: string }>) => setFreeModels(data))
      .catch(() => setFreeModels([]));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [d, m, j] = await Promise.all([
        getAgentDetail(agentId),
        getSummary(agentId),
        getAgentJobs(agentId),
      ]);
      setDetail(d);
      setMetrics(m);
      setJobs(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [agentId, getAgentDetail, getSummary, getAgentJobs]);

  useEffect(() => { loadData(); }, [loadData]);

  // Polling for active jobs
  useEffect(() => {
    const hasActive = jobs.some(j => !['done', 'error'].includes(j.status));
    if (!hasActive) return;

    const interval = setInterval(async () => {
      const updated = await getAgentJobs(agentId);
      setJobs(updated);
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, agentId, getAgentJobs]);

  const handleStartJob = async () => {
    if (!newUrl.trim()) return;
    setSubmitting(true);
    try {
      await startJob({
        agentId,
        youtubeUrl: newUrl.trim(),
        numClips: parseInt(numClips) || 3,
        providerId: detail?.agent.defaultProviderId || '',
        model: detail?.agent.defaultModel || '',
      });
      setNewUrl('');
      const updated = await getAgentJobs(agentId);
      setJobs(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar pipeline');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (clipId: string) => {
    try {
      await publishClip(clipId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar');
    }
  };

  if (loading) return <Loading label="Carregando dashboard do agent..." />;
  if (error && !detail) return <Alert variant="danger">{error}</Alert>;
  if (!detail) return <Alert variant="warning">Agent não encontrado</Alert>;

  const { agent, socialAccounts, totalClips, recentJobs } = detail;
  const m = metrics || {};

  return (
    <div className="agent-detail">
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Header */}
      <div className="agent-detail__header">
        <Button variant="ghost" onClick={onBack}>← Voltar</Button>
        <div className="agent-detail__title-row">
          <div className="agent-detail__avatar">
            {agent.avatarUrl ? (
              <img src={agent.avatarUrl} alt={agent.name} />
            ) : (
              <span>{agent.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="agent-detail__name">{agent.name}</h2>
            {agent.niche && <Badge tone="accent">{agent.niche}</Badge>}
          </div>
          <Badge tone={agent.active ? 'success' : 'neutral'} dot>
            {agent.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      {/* Métricas */}
      <div className="agent-detail__metrics">
        <Card className="agent-detail__metric">
          <span className="agent-detail__metric-value"><Icon name="video" size={18} /> {totalClips}</span>
          <span className="agent-detail__metric-label">Clips</span>
        </Card>
        <Card className="agent-detail__metric">
          <span className="agent-detail__metric-value"><Icon name="eye" size={18} /> {(m.totalViews || 0).toLocaleString()}</span>
          <span className="agent-detail__metric-label">Views</span>
        </Card>
        <Card className="agent-detail__metric">
          <span className="agent-detail__metric-value"><Icon name="heart" size={18} /> {(m.totalLikes || 0).toLocaleString()}</span>
          <span className="agent-detail__metric-label">Likes</span>
        </Card>
        <Card className="agent-detail__metric">
          <span className="agent-detail__metric-value"><Icon name="message" size={18} /> {(m.totalComments || 0).toLocaleString()}</span>
          <span className="agent-detail__metric-label">Comentários</span>
        </Card>
      </div>

      {/* Redes Sociais */}
      <Panel title="Redes Conectadas">
        <div className="agent-detail__socials">
          {(['youtube', 'tiktok', 'instagram'] as const).map((platform) => {
            const account = socialAccounts.find(s => s.platform === platform);
            return (
              <Card key={platform} className={`agent-detail__social ${account ? 'agent-detail__social--connected' : ''}`}>
                <span className="agent-detail__social-icon"><Icon name={PLATFORM_ICONS[platform]} size={18} /></span>
                <span className="agent-detail__social-name">{platform}</span>
                <Badge tone={account?.active ? 'success' : 'neutral'} dot>
                  {account?.active ? 'Conectado' : account ? 'Inativo' : 'Não conectado'}
                </Badge>
              </Card>
            );
          })}
        </div>
      </Panel>

      {/* Provider Selector */}
      <ProviderSelector
        selectedProviderId={agent.defaultProviderId}
        onSelect={async (providerId) => {
          try {
            await fetch(`${API_BASE}/shorts/agents/${agentId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ defaultProviderId: providerId }),
            });
            loadData();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao atualizar provider');
          }
        }}
      />

      {/* Modelo (grátis, OpenCode Zen) */}
      <Panel title="Modelo de IA (grátis)">
        <div className="agent-detail__model-row">
          <span className="agent-detail__model-label"><Icon name="sparkles" size={16} /> Modelo</span>
          <select
            className="input"
            value={agent.defaultModel || 'big-pickle'}
            onChange={async (e) => {
              const model = e.target.value;
              try {
                await fetch(`${API_BASE}/shorts/agents/${agentId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ defaultModel: model }),
                });
                loadData();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao atualizar modelo');
              }
            }}
          >
            {freeModels.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </Panel>

      {/* Novo Job */}
      <Panel title="Novo Corte">
        <div className="agent-detail__new-job">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Cole a URL do vídeo do YouTube..."
            icon="link"
          />
          <div className="agent-detail__new-job-row">
            <Input
              type="number"
              value={numClips}
              onChange={(e) => setNumClips(e.target.value)}
              label="Clips"
              placeholder="3"
            />
            <Button
              variant="primary"
              onClick={handleStartJob}
              disabled={submitting || !newUrl.trim()}
            >
              {submitting ? 'Iniciando...' : 'Gerar Cortes'}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Jobs Ativos */}
      {jobs.filter(j => !['done', 'error'].includes(j.status)).length > 0 && (
        <Panel title="Processando Agora">
          <div className="agent-detail__jobs">
            {jobs
              .filter(j => !['done', 'error'].includes(j.status))
              .map(job => (
                <PipelineJobCard key={job.id} job={job} />
              ))}
          </div>
        </Panel>
      )}

      {/* Jobs Recentes */}
      <Panel title="Jobs Recentes">
        {recentJobs.length === 0 ? (
          <EmptyState
            icon="film"
            title="Nenhum job ainda"
            description="Cole uma URL do YouTube acima pra começar."
          />
        ) : (
          <div className="agent-detail__jobs">
            {recentJobs.map(job => (
              <PipelineJobCard key={job.id} job={job} onPublish={handlePublish} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
