import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Camera, Plus, Clock } from 'lucide-react';

interface ScheduledPost {
  id: string;
  content: string;
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'draft';
}

const MOCK_POSTS: ScheduledPost[] = [
  { id: '1', content: 'Novo produto chegando amanhã! Fiquem de olho', scheduledFor: '2024-01-16 10:00', status: 'scheduled' },
  { id: '2', content: 'Behind the scenes do nosso escritório', scheduledFor: '2024-01-15 14:30', status: 'published' },
  { id: '3', content: 'Dica de produtividade: automatize tarefas repetitivas', scheduledFor: '2024-01-17 09:00', status: 'draft' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: 'var(--primary-muted)', color: 'var(--primary-light)' },
  published: { bg: 'var(--success-muted)', color: 'var(--success)' },
  draft: { bg: 'var(--surface-3)', color: 'var(--text-muted)' },
};

export default function InstagramPage() {
  const [posts, setPosts] = useState(MOCK_POSTS);

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Instagram</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="selector-pill" style={{ borderColor: 'var(--primary)', color: 'var(--primary-light)' }}>
              <Camera size={13} />
              Post Scheduler
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map((post) => {
              const s = STATUS_STYLE[post.status];
              return (
                <div
                  key={post.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{post.content}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      {post.scheduledFor}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, flexShrink: 0, marginLeft: 12 }}>
                    {post.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
