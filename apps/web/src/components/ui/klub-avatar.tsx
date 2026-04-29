import { cn } from '@/lib/utils';

/**
 * Sprint M batch SM-4 — KlubAvatar primitivo.
 *
 * Substitui 3 cópias locais do mesmo componente em home/klubs/buscar-klubs.
 * Inicial do nome em background colorido derivado do hash do nome
 * (estável: mesmo Klub sempre mesma cor).
 */
export interface KlubAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<KlubAvatarProps['size']>, string> = {
  sm: 'size-8 rounded-md text-xs',
  md: 'size-12 rounded-lg text-base',
  lg: 'size-16 rounded-xl text-xl',
};

export function KlubAvatar({ name, size = 'md', className }: KlubAvatarProps) {
  const trimmed = name.trim();
  const initial = trimmed.charAt(0).toUpperCase() || 'K';
  // Hash determinístico do nome → hue 0-359. Mesmo Klub = mesma cor.
  const hue = Array.from(trimmed).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center font-display font-bold text-white',
        SIZE_CLASS[size],
        className,
      )}
      style={{ background: `hsl(${hue} 55% 42%)` }}
      aria-label={`Avatar do Klub ${name}`}
    >
      {initial}
    </span>
  );
}
