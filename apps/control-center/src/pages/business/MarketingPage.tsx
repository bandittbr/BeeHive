import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Megaphone, Plus, Clock, BarChart3 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: 'active' | 'paused' | 'completed';
  reach: string;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Lançamento Produto X', channel: 'Instagram + YouTube', status: 'active', reach: '45.2K' },
  { id: '2', name: 'Black Friday 2024', channel: 'TikTok + Instagram', status: 'paused', reach: '120K' },
  { id: '3', name: 'Awareness Campaign', channel: 'YouTube Ads', status: 'completed', reach: '89.1K' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active: { bg: 'var(--success-muted)', color: 'var(--success)' },
  paused: { bg: 'var(--surface-3)', color: 'var(--text-muted)' },
  completed: { bg: 'var(--primary-muted)', color: 'var(--primary-light)' },
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Marketing</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Campanhas</h3>
            <button className="selector-pill" style={{ borderColor: 'var(--primary)', color: 'var(--primary-light)' }}>
              <Plus size={13} />
              Create Campaign
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((c) => {
              const s = STATUS_STYLE[c.status];
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                      <Megaphone size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        {c.channel} — Reach: {c.reach}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
                    {c.status}
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
