import { useEffect, useRef, useState } from 'react';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { usePromos } from '../context/PromosContext';
import type { Plato } from '../types/plato.types';
import styles from './MenuBanner.module.css';

const AUTOPLAY_MS = 5000;

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  platos: Plato[];
  onPlatoClick: (plato: Plato) => void;
  onCategoriaClick: (cat: string) => void;
}

// ── Componente ───────────────────────────────────────────────────────────────

export function MenuBanner({ platos, onPlatoClick, onCategoriaClick }: Props) {
  const { promos } = usePromos();
  const [active, setActive]   = useState(0);
  const [animKey, setAnimKey] = useState(0); // fuerza re-montaje de la animación
  const [paused, setPaused]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reinicia el índice si el número de promos cambia
  useEffect(() => { setActive(0); }, [promos.length]);

  // ── Autoplay ──────────────────────────────────────────────────────────────
  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!promos.length) return;
    timerRef.current = setInterval(() => {
      if (!paused) goTo((prev) => (prev + 1) % promos.length);
    }, AUTOPLAY_MS);
  }

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, promos.length]);

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

  function handlePrev() { handleNav((active - 1 + promos.length) % promos.length); }
  function handleNext() { handleNav((active + 1) % promos.length); }

  // ── Datos del slide activo ────────────────────────────────────────────────
  const slide = promos[active] ?? promos[0];
  const plato = slide?.ctaAccion === 'plato'
    ? platos.find((p) => p.id === Number(slide.ctaValor))
    : null;

  function handleCta() {
    if (slide.ctaAccion === 'plato' && plato?.disponible) {
      onPlatoClick(plato);
    } else if (slide.ctaAccion === 'categoria') {
      onCategoriaClick(slide.ctaValor);
    }
  }

  if (!promos.length) return null;

  return (
    <div
      className={styles.banner}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide ─────────────────────────────────────────────────────────── */}
      <div
        className={styles.slide}
        style={{ background: `linear-gradient(135deg, ${slide.colorFrom} 0%, ${slide.colorTo} 100%)` }}
      >
        {/* Glow de fondo */}
        <div className={styles.glow} style={{ background: slide.colorAcento }} />

        {/* Contenido animado */}
        <div className={styles.content} key={animKey}>
          {/* Texto */}
          <div className={styles.textSide}>
            <span className={styles.tag} style={{ color: slide.colorAcento, borderColor: `${slide.colorAcento}44` }}>
              {slide.tag}
            </span>
            <h2 className={styles.titulo}>{slide.titulo}</h2>
            <p className={styles.subtitulo}>{slide.subtitulo}</p>
            <button
              className={styles.ctaBtn}
              style={{ background: slide.colorAcento, color: isLight(slide.colorAcento) ? '#1c1917' : '#fff' }}
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
            <div className={styles.imgHalo} style={{ background: `${slide.colorAcento}28` }} />
            {slide.imageUrl ? (
              <div className={styles.imgWrap}>
                <img
                  src={slide.imageUrl}
                  alt={slide.titulo}
                  className={styles.platoImg}
                />
              </div>
            ) : plato ? (
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
            {/* Badge de tipo — ya no se usa, mantenido por compatibilidad CSS */}
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
          {promos.map((p, i) => (
            <button
              key={p.id}
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              style={i === active ? { background: slide.colorAcento } : {}}
              onClick={() => handleNav(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Barra de progreso */}
        {!paused && (
          <div className={styles.progressBar} key={`${animKey}-progress`}>
            <div className={styles.progressFill} style={{ background: slide.colorAcento }} />
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
