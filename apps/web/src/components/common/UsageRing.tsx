/**
 * UsageRing — anel circular de consumo de tokens.
 *
 * Mostra um anel SVG que preenche 360° conforme o uso de tokens.
 * Ao clicar, abre um popup com detalhes: total, usado, resets.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '@/lib/api';
import './UsageRing.css';

interface UsageData {
  used: number;
  limit: number;
  resetAt: string | null;
}

const RADIUS = 14;
const STROKE = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function UsageRing() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/shorts/usage`);
      if (!res.ok) return;
      const data = await res.json();
      setUsage({
        used: data.used ?? 0,
        limit: data.limit ?? 1000,
        resetAt: data.resetAt ?? null,
      });
    } catch {
      // Ignora — mostra anel vazio
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const percent = usage ? Math.min(usage.used / usage.limit, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - percent);
  const percentLabel = usage ? Math.round(percent * 100) : 0;

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const resetLabel = usage?.resetAt
    ? new Date(usage.resetAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="usage-ring" ref={ref}>
      <button
        type="button"
        className="usage-ring__trigger"
        onClick={() => setOpen(!open)}
        aria-label="Consumo de tokens"
      >
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle
            className="usage-ring__bg"
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
          />
          <circle
            className="usage-ring__fill"
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span className="usage-ring__label">{percentLabel}%</span>
      </button>

      {open && (
        <div className="usage-ring__popup">
          <div className="usage-ring__popup-header">Consumo de Tokens</div>

          <div className="usage-ring__popup-ring">
            <svg width="80" height="80" viewBox="0 0 36 36">
              <circle
                className="usage-ring__bg"
                cx="18" cy="18" r={RADIUS}
                fill="none" stroke="currentColor" strokeWidth={2.5}
              />
              <circle
                className="usage-ring__fill"
                cx="18" cy="18" r={RADIUS}
                fill="none" stroke="currentColor" strokeWidth={2.5}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span className="usage-ring__popup-percent">{percentLabel}%</span>
          </div>

          <div className="usage-ring__popup-stats">
            <div className="usage-ring__stat">
              <span className="usage-ring__stat-label">Usado</span>
              <span className="usage-ring__stat-value">{formatNumber(usage?.used ?? 0)}</span>
            </div>
            <div className="usage-ring__stat">
              <span className="usage-ring__stat-label">Limite</span>
              <span className="usage-ring__stat-value">{formatNumber(usage?.limit ?? 0)}</span>
            </div>
            <div className="usage-ring__stat">
              <span className="usage-ring__stat-label">Reseta em</span>
              <span className="usage-ring__stat-value">{resetLabel}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
