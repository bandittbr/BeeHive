import { Link } from 'react-router-dom';
import { ChevronLeft, Zap } from 'lucide-react';

const SKILLS = [
  { id: '1', name: 'chat.generate', description: 'Geração de texto e conversação', status: 'active' },
  { id: '2', name: 'browser.navigate', description: 'Navegação e scraping web', status: 'active' },
  { id: '3', name: 'browser.screenshot', description: 'Captura de tela de páginas web', status: 'active' },
  { id: '4', name: 'image.generate', description: 'Geração de imagens com IA', status: 'active' },
  { id: '5', name: 'code.generate', description: 'Geração e revisão de código', status: 'active' },
  { id: '6', name: 'memory.store', description: 'Armazenamento de dados persistentes', status: 'active' },
  { id: '7', name: 'video.generate', description: 'Geração de vídeos curtos', status: 'beta' },
  { id: '8', name: 'audio.generate', description: 'Síntese de voz e áudio', status: 'beta' },
  { id: '9', name: 'email.send', description: 'Envio de emails automatizados', status: 'inactive' },
  { id: '10', name: 'calendar.manage', description: 'Gestão de agenda e compromissos', status: 'inactive' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: 'var(--success-muted)', color: 'var(--success)' },
  beta: { bg: 'var(--primary-muted)', color: 'var(--primary-light)' },
  inactive: { bg: 'var(--surface-3)', color: 'var(--text-muted)' },
};

export default function SkillsPage() {
  return (
    <div className="center-col">
      <header className="topbar">
        <h1 className="topbar-title">Skills</h1>
      </header>
      <div className="content-scroll">
        <Link to="/negocios" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Back to Negócios
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SKILLS.map((skill) => {
            const colors = STATUS_COLORS[skill.status];
            return (
              <div
                key={skill.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)' }}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{skill.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{skill.description}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: colors.bg, color: colors.color }}>
                  {skill.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
