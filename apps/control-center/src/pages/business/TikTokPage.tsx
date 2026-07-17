import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Clock, Hash } from 'lucide-react';

interface ScheduledVideo {
  id: string;
  title: string;
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'processing';
}

const MOCK_VIDEOS: ScheduledVideo[] = [
  { id: '1', title: 'Tutorial: Como automatizar seu marketing', scheduledFor: '2024-01-16 12:00', status: 'scheduled' },
  { id: '2', title: 'BeeHive Demo - Módulo de Agentes', scheduledFor: '2024-01-15 18:00', status: 'published' },
  { id: '3', title: 'Short: 3 dicas de produtividade', scheduledFor: '2024-01-17 09:00', status: 'processing' },
];

const TRENDING = ['#AI', '#Automatização', '#Produtividade', '#MarketingDigital', '#Tecnologia', '#Startup'];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: 'var(--primary-muted)', color: 'var(--primary-light)' },
  published: { bg: 'var(--success-muted)', color: 'var(--success)' },
  processing: { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' },
};

export default function TikTokPage() {
  const [videos, setVideos] = useState(MOCK_VIDEOS);

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">TikTok</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="chat-panel" style={{ marginBottom: 0 }}>
            <div className="chat-panel-header">
              <h2 className="chat-title">Trending Topics</h2>
              <TrendingUp size={16} style={{ color: 'var(--primary-light)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TRENDING.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    fontSize: 12,
                    color: 'var(--primary-light)',
                  }}
                >
                  <Hash size={12} />
                  {tag.replace('#', '')}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Video Scheduler</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {videos.map((vid) => {
                const s = STATUS_STYLE[vid.status];
                return (
                  <div
                    key={vid.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{vid.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <Clock size={12} />
                        {vid.scheduledFor}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
                      {vid.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
