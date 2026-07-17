import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Video, Play } from 'lucide-react';

const DURATIONS = ['5s', '10s', '15s', '30s'];

interface GeneratedVideo {
  id: string;
  prompt: string;
  duration: string;
  status: 'completed' | 'processing';
  gradient: string;
}

const MOCK_VIDEOS: GeneratedVideo[] = [
  { id: '1', prompt: 'Timelapse of a busy city intersection', duration: '10s', status: 'completed', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { id: '2', prompt: 'Ocean waves crashing on rocks', duration: '15s', status: 'completed', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { id: '3', prompt: 'Abstract liquid simulation', duration: '5s', status: 'processing', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
];

export default function VideoPage() {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('10s');
  const [videos, setVideos] = useState(MOCK_VIDEOS);

  const generate = () => {
    if (!prompt.trim()) return;
    const newVid: GeneratedVideo = {
      id: Date.now().toString(),
      prompt,
      duration,
      status: 'completed',
      gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    };
    setVideos((prev) => [newVid, ...prev]);
    setPrompt('');
  };

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Video</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chat-panel" style={{ marginBottom: 0 }}>
            <div className="chat-panel-header">
              <h2 className="chat-title">Video Generator</h2>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className="selector-pill"
                  style={{
                    borderColor: duration === d ? 'var(--primary)' : 'var(--border)',
                    color: duration === d ? 'var(--primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="chat-input-box" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Descreva o vídeo que deseja gerar..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
              />
              <div className="chat-input-actions">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{duration}</span>
                <button className="input-send-btn" onClick={generate}>
                  <Video size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {videos.map((vid) => (
              <div
                key={vid.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 72,
                    borderRadius: 'var(--radius-sm)',
                    background: vid.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Play size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{vid.prompt}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{vid.duration}</span>
                    <span>•</span>
                    <span style={{ color: vid.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}>{vid.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
