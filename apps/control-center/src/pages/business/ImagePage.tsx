import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Sparkles } from 'lucide-react';

const STYLES = ['Photorealistic', 'Illustration', 'Watercolor', 'Pixel Art', '3D Render', 'Oil Painting'];

interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  gradient: string;
}

const MOCK_IMAGES: GeneratedImage[] = [
  { id: '1', prompt: 'Futuristic cityscape at sunset', style: 'Photorealistic', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { id: '2', prompt: 'Cyberpunk character portrait', style: 'Illustration', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { id: '3', prompt: 'Mountain landscape with aurora', style: 'Watercolor', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { id: '4', prompt: 'Abstract geometric patterns', style: 'Pixel Art', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
];

export default function ImagePage() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Photorealistic');
  const [images, setImages] = useState(MOCK_IMAGES);

  const generate = () => {
    if (!prompt.trim()) return;
    const gradients = [
      'linear-gradient(135deg, #a18cd1, #fbc2eb)',
      'linear-gradient(135deg, #fad0c4, #ffd1ff)',
      'linear-gradient(135deg, #ffecd2, #fcb69f)',
      'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
    ];
    const newImg: GeneratedImage = {
      id: Date.now().toString(),
      prompt,
      style,
      gradient: gradients[Math.floor(Math.random() * gradients.length)],
    };
    setImages((prev) => [newImg, ...prev]);
    setPrompt('');
  };

  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Image</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chat-panel" style={{ marginBottom: 0 }}>
            <div className="chat-panel-header">
              <h2 className="chat-title">Image Generator</h2>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className="selector-pill"
                  style={{
                    borderColor: style === s ? 'var(--primary)' : 'var(--border)',
                    color: style === s ? 'var(--primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="chat-input-box" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="Descreva a imagem que deseja gerar..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
              />
              <div className="chat-input-actions">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{style}</span>
                <button className="input-send-btn" onClick={generate}>
                  <Sparkles size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {images.map((img) => (
              <div
                key={img.id}
                style={{
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ height: 140, background: img.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={28} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.prompt}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{img.style}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
