import styles from './AnimatedBg.module.css';

/** Fondo animado temática restaurante — usado en Login y Registro */
export function AnimatedBg() {
  return (
    <div className={styles.bg} aria-hidden="true">
      {/* Orbs de color */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />
      <div className={`${styles.orb} ${styles.orb4}`} />

      {/* Iconos flotantes SVG */}
      <svg className={`${styles.icon} ${styles.icon1}`} viewBox="0 0 40 40" fill="none">
        {/* Plato con cúpula */}
        <ellipse cx="20" cy="28" rx="16" ry="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 28 Q4 16 20 14 Q36 16 36 28" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M13 14 Q20 6 27 14" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>

      <svg className={`${styles.icon} ${styles.icon2}`} viewBox="0 0 40 40" fill="none">
        {/* Tenedor */}
        <line x1="20" y1="4" x2="20" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="14" y1="4" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="26" y1="4" x2="26" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14 16 Q14 22 20 22 Q26 22 26 16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>

      <svg className={`${styles.icon} ${styles.icon3}`} viewBox="0 0 40 40" fill="none">
        {/* Cuchillo */}
        <path d="M20 4 L26 18 L20 22 L20 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <line x1="20" y1="4" x2="14" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      <svg className={`${styles.icon} ${styles.icon4}`} viewBox="0 0 40 40" fill="none">
        {/* Copa */}
        <path d="M10 6 L30 6 L24 20 L22 24 L18 24 L16 20 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
        <line x1="20" y1="24" x2="20" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="13" y1="34" x2="27" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>

      <svg className={`${styles.icon} ${styles.icon5}`} viewBox="0 0 40 40" fill="none">
        {/* Olla */}
        <rect x="8" y="16" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="4" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="36" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="14" y="10" width="12" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="16" y1="22" x2="16" y2="28" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
        <line x1="20" y1="20" x2="20" y2="28" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
        <line x1="24" y1="22" x2="24" y2="28" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      </svg>

      <svg className={`${styles.icon} ${styles.icon6}`} viewBox="0 0 40 40" fill="none">
        {/* Estrella / calificación */}
        <path d="M20 4 L23 14 L34 14 L25 21 L28 32 L20 25 L12 32 L15 21 L6 14 L17 14 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      </svg>

      {/* Grid sutil de fondo */}
      <div className={styles.grid} />
    </div>
  );
}
