import * as React from 'react';

interface CourtPatternProps {
  opacity?: number;
  className?: string;
}

/**
 * Padrão geométrico de quadra de tênis. Usado como ornamento no hero
 * do desktop, atrás da tagline. Linhas em primary-200 com fade vertical.
 */
export function CourtPattern({ opacity = 0.16, className }: CourtPatternProps) {
  const stroke = 'hsl(var(--brand-primary-200))';
  return (
    <svg
      viewBox="0 0 720 900"
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity,
      }}
    >
      <defs>
        <linearGradient id="dk-court-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="60%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="dk-court-mask">
          <rect width="720" height="900" fill="url(#dk-court-fade)" />
        </mask>
      </defs>

      <g
        transform="translate(360 460) rotate(-18) translate(-300 -360)"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        mask="url(#dk-court-mask)"
      >
        <rect x="0" y="0" width="600" height="720" rx="2" />
        <line x1="60" y1="0" x2="60" y2="720" />
        <line x1="540" y1="0" x2="540" y2="720" />
        <line x1="60" y1="180" x2="540" y2="180" />
        <line x1="60" y1="540" x2="540" y2="540" />
        <line x1="300" y1="180" x2="300" y2="540" />
        <line x1="0" y1="360" x2="600" y2="360" strokeWidth="2.5" />
        <line x1="300" y1="0" x2="300" y2="20" />
        <line x1="300" y1="700" x2="300" y2="720" />
      </g>

      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="2 6" opacity="0.6">
        <path d="M 80 120 Q 240 40 420 140" />
        <path d="M 540 760 Q 380 820 220 770" />
      </g>
      <circle cx="420" cy="140" r="6" fill="hsl(var(--brand-accent-400))" opacity="0.9" />
      <circle cx="420" cy="140" r="6" fill="none" stroke={stroke} strokeWidth="0.6" />
    </svg>
  );
}
