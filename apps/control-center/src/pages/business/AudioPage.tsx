import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Music2, Play, Square } from 'lucide-react';

const VOICES = ['Neural Male', 'Neural Female', 'Neural Child', 'Narrator', 'Dramatic'];

interface GeneratedAudio {
  id: string;
  text: string;
  voice: string;
  duration: string;
  status: 'completed' | 'processing';
}

const MOCK_AUDIO: GeneratedAudio[] = [
  { id: '1', text: 'Bem-vindos ao BeeHive, a plataforma de IA modular.', voice: 'Neural Male', duration: '0:08', status: 'completed' },
  { id: '2', text: 'Marketing strategy for Q4 campaign launch.', voice: 'Neural Female', duration: '0:12', status: 'completed' },
  { id: '3', text: 'Relatório diário de analytics processado.', voice: 'Narrator', duration: '0:06', status: 'processing' },
];

export default function AudioPage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Neural Male');
  const [audios, setAudios] = useState(MOCK_AUDIO);

  const generate = () => {
    if (!text.trim()) return;
    const newAudio: GeneratedAudio = {
      id: Date.now().toString(),
      text,
      voice,
      duration: `0:${String(Math.floor(Math.random() * 20 + 3)).padStart(2, '0')}`,
      status: 'completed',
    };
    setAudios((prev) => [newAudio, ...prev]);
    setText('');
  };

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Audio</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chat-panel" style={{ marginBottom: 0 }}>
            <div className="chat-panel-header">
              <h2 className="chat-title">Audio Generator</h2>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {VOICES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVoice(v)}
                  className="selector-pill"
                  style={{
                    borderColor: voice === v ? 'var(--primary)' : 'var(--border)',
                    color: voice === v ? 'var(--primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="chat-input-box" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Digite o texto para gerar áudio..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
              />
              <div className="chat-input-actions">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{voice}</span>
                <button className="input-send-btn" onClick={generate}>
                  <Music2 size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {audios.map((audio) => (
              <div
                key={audio.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <button className="icon-square-btn" style={{ flexShrink: 0 }}>
                  <Play size={14} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audio.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                    <span>{audio.voice}</span>
                    <span>{audio.duration}</span>
                    <span style={{ color: audio.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}>{audio.status}</span>
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
