import { useEffect, useRef, useState } from 'react';
import { PlatoImage } from '@/shared/components/PlatoImage';
import type { Plato } from '../types/plato.types';
import styles from './MenuBanner.module.css';

// ── Definición de slides ─────────────────────────────────────────────────────

interface Slide {
  id: number;
  tipo: 'oferta' | 'destacado' | 'novedad' | 'promo';
  tag: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  ctaAccion: 'plato' | 'categoria';
  ctaValor: string | number; // platoId o nombre de categoría
  from: string;  // color inicio del gradiente
  to: string;    // color fin
  acento: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    tipo: 'oferta',
    tag: '🔥 Oferta del día',
    titulo: 'Bandeja Paisa',
    subtitulo: '15% de descuento — solo hasta las 3 pm',
    cta: 'Pedir ahora',
    ctaAccion: 'plato', ctaValor: 1,
    from: '#5c1205', to: '#a82a06',
    acento: '#ff7a45',
  },
  {
    id: 2,
    tipo: 'destacado',
    tag: '⭐ Lo mejor de la casa',
    titulo: 'Ajiaco Bogotano',
    subtitulo: 'Receta tradicional con pollo criollo y guascas del campo',
    cta: 'Ver plato',
    ctaAccion: 'plato', ctaValor: 2,
    from: '#0f2e1a', to: '#1a5c2e',
    acento: '#4ade80',
  },
  {
    id: 3,
    tipo: 'novedad',
    tag: '✨ Novedad en el menú',
    titulo: 'Empanadas de Pipián',
    subtitulo: 'Masa crujiente, relleno de papa con maní y ají amarillo',
    cta: 'Probar',
    ctaAccion: 'plato', ctaValor: 3,
    from: '#1c1700', to: '#3d3000',
    acento: '#fbbf24',
  },
  {
    id: 4,
    tipo: 'promo',
    tag: '🕐 Happy Hour',
    titulo: 'Bebidas 2×1',
    subtitulo: 'Todos los jugos y agua panela — de 3 pm a 6 pm',
    cta: 'Ver bebidas',
    ctaAccion: 'categoria', ctaValor: 'Bebidas',
    from: '#0c1a3a', to: '#133060',
    acento: '#60a5fa',
  },
];

const AUTOPLAY_MS = 5000;

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  platos: Plato[];
  onPlatoClick: (plato: Plato) => void;
  onCategoriaClick: (cat: string) => void;
}

// ── Componente ───────────────────────────────────────────────────────────────

export function MenuBanner({ platos, onPlatoClick, onCategoriaClick }: Props) {
  const [active, setActive]   = useState(0);
  const [animKey, setAnimKey] = useState(0); // fuerza re-montaje de la animación
  const [paused, setPaused]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Autoplay ──────────────────────────────────────────────────────────────
  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!paused) goTo((prev) => (prev + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
  }

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  function goTo(indexOrUpdater: number | ((prev: number) => number)) {
    setActive((prev) => {
      const next = typeof indexOrUpdater === 'function' ? indexOrUpdater(prev) : indexOrUpdater;
      if (next !== prev) setAnimKey((k) => k + 1);
      return next;
    });
  }

  function handleNav(index: number) {
    goTo(index);
    resetTimer();
  }

  function handlePrev() { handleNav((active - 1 + SLIDES.length) % SLIDES.length); }
  function handleNext() { handleNav((active + 1) % SLIDES.length); }

  // ── Datos del slide activo ────────────────────────────────────────────────
  const slide = SLIDES[active];
  const plato = typeof slide.ctaValor === 'number'
    ? platos.find((p) => p.id === slide.ctaValor)
    : null;

  function handleCta() {
    if (slide.ctaAccion === 'plato' && plato?.disponible) {
      onPlatoClick(plato);
    } else if (slide.ctaAccion === 'categoria') {
      onCategoriaClick(slide.ctaValor as string);
    }
  }

  return (
    <div
      className={styles.banner}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide ─────────────────────────────────────────────────────────── */}
      <div
        className={styles.slide}
        style={{ background: `linear-gradient(135deg, ${slide.from} 0%, ${slide.to} 100%)` }}
      >
        {/* Glow de fondo */}
        <div className={styles.glow} style={{ background: slide.acento }} />

        {/* Contenido animado */}
        <div className={styles.content} key={animKey}>
          {/* Texto */}
          <div className={styles.textSide}>
            <span className={styles.tag} style={{ color: slide.acento, borderColor: `${slide.acento}44` }}>
              {slide.tag}
            </span>
            <h2 className={styles.titulo}>{slide.titulo}</h2>
            <p className={styles.subtitulo}>{slide.subtitulo}</p>
            <button
              className={styles.ctaBtn}
              style={{ background: slide.acento, color: isLight(slide.acento) ? '#1c1917' : '#fff' }}
              onClick={handleCta}
            >
              {slide.cta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Imagen del plato */}
          <div className={styles.imgSide}>
            <div className={styles.imgHalo} style={{ background: `${slide.acento}28` }} />
            {plato ? (
              <div className={styles.imgWrap}>
                <PlatoImage
                  nombre={plato.nombre}
                  categoria={plato.categoria}
                  imageUrl={plato.imageUrl}
                  size="xl"
                  className={styles.platoImg}
                />
              </div>
            ) : (
              <div className={styles.emojiPlaceholder}>
                {slide.ctaValor === 'Bebidas' ? '🥤' : '🍽️'}
              </div>
            )}
            {/* Badge de tipo */}
            {slide.tipo === 'oferta' && (
              <div className={styles.ofertaBadge} style={{ background: slide.acento, color: isLight(slide.acento) ? '#1c1917' : '#fff' }}>
                −15%
              </div>
            )}
          </div>
        </div>

        {/* ── Controles ─────────────────────────────────────────────────── */}
        <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={handlePrev} aria-label="Anterior">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={handleNext} aria-label="Siguiente">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* ── Dots ──────────────────────────────────────────────────────── */}
        <div className={styles.dots}>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              style={i === active ? { background: slide.acento } : {}}
              onClick={() => handleNav(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Barra de progreso */}
        {!paused && (
          <div className={styles.progressBar} key={`${animKey}-progress`}>
            <div className={styles.progressFill} style={{ background: slide.acento }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Determina si un color hex es claro (para elegir texto negro o blanco) */
function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}
