import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, PlaySquare, Clock, BarChart3, Eye, ThumbsUp } from 'lucide-react';

interface ScheduledVideo {
  id: string;
  title: string;
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'processing';
}

const MOCK_VIDEOS: ScheduledVideo[] = [
  { id: '1', title: 'Complete Guide to BeeHive Platform', scheduledFor: '2024-01-16 15:00', status: 'scheduled' },
  { id: '2', title: 'How to Create AI Agents - Tutorial', scheduledFor: '2024-01-14 10:00', status: 'published' },
  { id: '3', title: 'Automation Workflows Deep Dive', scheduledFor: '2024-01-18 12:00', status: 'processing' },
];

const ANALYTICS_DATA = [
  { label: 'Views', value: '12.4K', icon: Eye, delta: '+23%' },
  { label: 'Likes', value: '842', icon: ThumbsUp, delta: '+15%' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: 'var(--primary-muted)', color: 'var(--primary-light)' },
  published: { bg: 'var(--success-muted)', color: 'var(--success)' },
  processing: { bg: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' },
};

export default function YouTubePage() {
  const [videos, setVideos] = useState(MOCK_VIDEOS);

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">YouTube</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {ANALYTICS_DATA.map((m) => (
              <div key={m.label} className="stat-card">
                <span className="stat-label">{m.label}</span>
                <span className="stat-value">{m.value}</span>
                <span className="stat-delta up">{m.delta}</span>
              </div>
            ))}
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
                      gap: 14,
                      padding: '14px 16px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div style={{ width: 80, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PlaySquare size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{vid.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <Clock size={12} />
                        {vid.scheduledFor}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0 }}>
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
