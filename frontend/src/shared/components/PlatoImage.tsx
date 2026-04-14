import { useState } from 'react';
import styles from './PlatoImage.module.css';

/** Gradientes por categoría */
const CAT_STYLE: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
  'Platos fuertes': {
    from: '#7c2d12', to: '#c2410c',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <ellipse cx="24" cy="36" rx="18" ry="5" />
        <path d="M6 36 Q6 20 24 17 Q42 20 42 36" />
        <path d="M15 17 Q24 7 33 17" />
      </svg>
    ),
  },
  'Entradas': {
    from: '#14532d', to: '#15803d',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M24 8 L28 20 L42 20 L31 29 L35 41 L24 32 L13 41 L17 29 L6 20 L20 20 Z" />
      </svg>
    ),
  },
  'Bebidas': {
    from: '#1e3a8a', to: '#2563eb',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M14 8 L34 8 L30 36 Q30 40 24 40 Q18 40 18 36 Z" />
        <line x1="24" y1="40" x2="24" y2="44" />
        <line x1="16" y1="44" x2="32" y2="44" />
        <path d="M30 14 L38 14 L38 22 Q38 26 30 22" />
      </svg>
    ),
  },
  'Postres': {
    from: '#581c87', to: '#7c3aed',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M8 28 Q8 18 24 16 Q40 18 40 28 L40 34 Q40 38 24 38 Q8 38 8 34 Z" />
        <path d="M16 16 Q16 10 24 8 Q32 10 32 16" />
        <line x1="24" y1="8" x2="24" y2="4" />
        <line x1="8" y1="34" x2="40" y2="34" />
      </svg>
    ),
  },
};

const FALLBACK = {
  from: '#374151', to: '#6b7280',
  icon: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="24" cy="36" rx="18" ry="5" />
      <path d="M6 36 Q6 20 24 17 Q42 20 42 36" />
      <path d="M15 17 Q24 7 33 17" />
    </svg>
  ),
};

interface Props {
  imageUrl?: string;
  nombre: string;
  categoria: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PlatoImage({ imageUrl, nombre, categoria, className = '', size = 'md' }: Props) {
  const [imgError, setImgError] = useState(false);
  const cat = CAT_STYLE[categoria] ?? FALLBACK;

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={nombre}
        className={`${styles.img} ${styles[size]} ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${styles.placeholder} ${styles[size]} ${className}`}
      style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}
      aria-label={nombre}
      role="img"
    >
      <div className={styles.iconWrap}>{cat.icon}</div>
      <span className={styles.initial}>{nombre.charAt(0).toUpperCase()}</span>
    </div>
  );
}
