import { Card, Badge } from '@/components/ui';
import type { PipelineJob } from './useShorts';
import './PipelineJobCard.css';

const STATUS_ICONS: Record<string, string> = {
  queued: '⏳',
  downloading: '⬇️',
  transcribing: '🎤',
  analyzing: '🧠',
  cropping: '✂️',
  generating_metadata: '📝',
  publishing: '📤',
  done: '✅',
  error: '❌',
};

const STATUS_LABELS: Record<string, string> = {
  queued: 'Na fila',
  downloading: 'Baixando vídeo',
  transcribing: 'Transcrevendo áudio',
  analyzing: 'IA analisando cortes',
  cropping: 'Recortando clipes',
  generating_metadata: 'Gerando título e hashtags',
  publishing: 'Publicando',
  done: 'Concluído',
  error: 'Erro',
};

interface PipelineJobCardProps {
  job: PipelineJob;
  onPublish?: (clipId: string) => void;
}

export function PipelineJobCard({ job, onPublish }: PipelineJobCardProps) {
  const isActive = !['done', 'error'].includes(job.status);
  const icon = STATUS_ICONS[job.status] || '📋';
  const label = STATUS_LABELS[job.status] || job.status;

  return (
    <Card className={`pj-card ${isActive ? 'pj-card--active' : ''} ${job.status === 'error' ? 'pj-card--error' : ''}`}>
      <div className="pj-card__header">
        <span className="pj-card__icon">{icon}</span>
        <div className="pj-card__info">
          <span className="pj-card__url" title={job.youtubeUrl}>
            {job.youtubeUrl.length > 50 ? job.youtubeUrl.slice(0, 50) + '...' : job.youtubeUrl}
          </span>
          <span className="pj-card__status">{label}</span>
        </div>
        <Badge tone={isActive ? 'info' : job.status === 'done' ? 'success' : 'neutral'}>
          {job.numClips} clips
        </Badge>
      </div>

      {isActive && (
        <div className="pj-card__progress">
          <div className="pj-card__progress-bar">
            <div
              className="pj-card__progress-fill"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <span className="pj-card__progress-text">{job.progress}%</span>
        </div>
      )}

      {job.status === 'error' && job.errorMessage && (
        <div className="pj-card__error">{job.errorMessage}</div>
      )}

      {job.status === 'done' && job.clips && job.clips.length > 0 && (
        <div className="pj-card__clips">
          {job.clips.map(clip => (
            <div key={clip.id} className="pj-card__clip">
              <span className="pj-card__clip-title">{clip.title || 'Sem título'}</span>
              <Badge tone={clip.score >= 70 ? 'success' : clip.score >= 40 ? 'accent' : 'neutral'}>
                {clip.score}%
              </Badge>
              {onPublish && (
                <button
                  className="pj-card__clip-publish"
                  onClick={() => onPublish(clip.id)}
                >
                  📤 Publicar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pj-card__footer">
        <span className="pj-card__time">
          {job.createdAt ? new Date(job.createdAt).toLocaleString('pt-BR') : ''}
        </span>
      </div>
    </Card>
  );
}
