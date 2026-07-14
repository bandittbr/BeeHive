import { Card, Badge, Button } from '@/components/ui';
import type { PipelineClip } from './useShorts';
import { API_BASE } from '@/lib/api';
import './ClipPreviewCard.css';

interface ClipPreviewCardProps {
  clip: PipelineClip;
  onPublish?: (clipId: string) => void;
}

export function ClipPreviewCard({ clip, onPublish }: ClipPreviewCardProps) {
  const hashtags = Array.isArray(clip.hashtags) ? clip.hashtags : [];

  return (
    <Card className="clip-card">
      <div className="clip-card__header">
        <h4 className="clip-card__title">{clip.title || 'Sem título'}</h4>
        <Badge tone={clip.score >= 70 ? 'success' : clip.score >= 40 ? 'accent' : 'neutral'}>
          {clip.score}%
        </Badge>
      </div>

      <p className="clip-card__description">{clip.description}</p>

      <div className="clip-card__hashtags">
        {hashtags.map((tag, i) => (
          <span key={i} className="clip-card__hashtag">#{tag}</span>
        ))}
      </div>

      <div className="clip-card__meta">
        <span>⏱️ {Math.round(clip.startTime)}s — {Math.round(clip.endTime)}s</span>
        <span>📐 {Math.round(clip.duration)}s</span>
      </div>

      {clip.hookSentence && (
        <div className="clip-card__hook">
          <strong>Hook:</strong> "{clip.hookSentence}"
        </div>
      )}

      {clip.viralityReason && (
        <div className="clip-card__reason">
          <strong>Por que é viral:</strong> {clip.viralityReason}
        </div>
      )}

      {clip.clipPath && (
        <div className="clip-card__video">
          <video src={`${API_BASE}${clip.clipPath}`} controls preload="metadata" className="clip-card__player" />
        </div>
      )}

      <div className="clip-card__actions">
        {clip.clipPath && (
          <a href={`${API_BASE}${clip.clipPath}`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" icon="play">
              Assistir
            </Button>
          </a>
        )}
        {onPublish && (
          <Button variant="primary" size="sm" icon="send" onClick={() => onPublish(clip.id)}>
            Publicar
          </Button>
        )}
      </div>
    </Card>
  );
}
