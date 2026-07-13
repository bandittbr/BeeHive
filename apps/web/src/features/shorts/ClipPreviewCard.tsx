import { Card, Badge, Button } from '@/components/ui';
import type { PipelineClip } from './useShorts';
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

      <div className="clip-card__actions">
        {clip.clipPath && (
          <Button variant="secondary" size="sm">
            ▶️ Assistir
          </Button>
        )}
        {onPublish && (
          <Button variant="primary" size="sm" onClick={() => onPublish(clip.id)}>
            📤 Publicar
          </Button>
        )}
      </div>
    </Card>
  );
}
