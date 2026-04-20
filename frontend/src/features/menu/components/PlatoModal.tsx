import { useEffect, useRef, useState } from 'react';
import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { PlatoImage } from '@/shared/components/PlatoImage';
import type { Plato } from '../types/plato.types';
import styles from './PlatoModal.module.css';

interface Props {
  plato: Plato;
  onClose: () => void;
  onAdded: () => void;
}

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function PlatoModal({ plato, onClose, onAdded }: Props) {
  const { addItem } = useCarrito();
  const sheetRef = useRef<HTMLDivElement>(null);

  const [cantidad, setCantidad]             = useState(1);
  const [removidos, setRemovidos]           = useState<Set<string>>(new Set());
  const [extrasQty, setExtrasQty]           = useState<Record<string, number>>({});
  const [nota, setNota]                     = useState('');

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleIngrediente(ing: string) {
    setRemovidos((prev) => {
      const next = new Set(prev);
      next.has(ing) ? next.delete(ing) : next.add(ing);
      return next;
    });
  }

  function setExtra(nombre: string, delta: number) {
    setExtrasQty((prev) => {
      const current = prev[nombre] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [nombre]: next };
    });
  }

  // Precio total = (precio base + extras) * cantidad
  const extrasTotal = plato.extras.reduce((s, e) => s + (extrasQty[e.nombre] ?? 0) * e.precio, 0);
  const precioTotal = (plato.precio + extrasTotal) * cantidad;

  function handleAgregar() {
    const extrasActivos = plato.extras
      .filter((e) => (extrasQty[e.nombre] ?? 0) > 0)
      .map((e) => ({ nombre: e.nombre, precio: e.precio, cantidad: extrasQty[e.nombre] }));

    addItem({
      platoId: plato.id,
      nombre: plato.nombre,
      precio: plato.precio,
      categoria: plato.categoria,
      ingredientesRemovidos: removidos.size > 0 ? Array.from(removidos) : undefined,
      extras: extrasActivos.length > 0 ? extrasActivos : undefined,
      nota: nota.trim() || undefined,
    });
    onAdded();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={plato.nombre}
      >
        {/* Drag handle */}
        <div className={styles.handle} />

        {/* Close */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.body}>
          {/* Hero image */}
          <div className={styles.hero}>
            <PlatoImage nombre={plato.nombre} categoria={plato.categoria} imageUrl={plato.imageUrl} size="xl" className={styles.heroImg} />
            <span className={styles.catBadge}>{plato.categoria}</span>
          </div>

          {/* Info básica */}
          <div className={styles.info}>
            <h2 className={styles.nombre}>{plato.nombre}</h2>
            <p className={styles.precioBase}>{formatPrecio(plato.precio)}</p>
            <p className={styles.desc}>{plato.descripcion}</p>
          </div>

          {/* ── Personalización ── */}
          <div className={styles.seccion}>
            <h3 className={styles.seccionTitle}>Personaliza tu pedido</h3>

            {/* Ingredientes a remover */}
            {plato.ingredientes.length > 0 && (
              <div className={styles.grupo}>
                <p className={styles.grupoLabel}>¿Quitar algún ingrediente?</p>
                <div className={styles.chipsWrap}>
                  {plato.ingredientes.map((ing) => (
                    <button
                      key={ing}
                      className={`${styles.ingChip} ${removidos.has(ing) ? styles.ingChipRemoved : ''}`}
                      onClick={() => toggleIngrediente(ing)}
                    >
                      {removidos.has(ing) && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={styles.chipX}>
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      {ing}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {plato.extras.length > 0 && (
              <div className={styles.grupo}>
                <p className={styles.grupoLabel}>Extras</p>
                <div className={styles.extrasList}>
                  {plato.extras.map((e) => {
                    const qty = extrasQty[e.nombre] ?? 0;
                    return (
                      <div key={e.nombre} className={styles.extraRow}>
                        <div className={styles.extraInfo}>
                          <span className={styles.extraNombre}>{e.nombre}</span>
                          <span className={styles.extraPrecio}>+{formatPrecio(e.precio)}</span>
                        </div>
                        <div className={styles.qtyControl}>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => setExtra(e.nombre, -1)}
                            disabled={qty === 0}
                            aria-label="Quitar"
                          >−</button>
                          <span className={styles.qtyNum}>{qty}</span>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => setExtra(e.nombre, +1)}
                            aria-label="Agregar"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nota libre */}
            <div className={styles.grupo}>
              <p className={styles.grupoLabel}>Instrucción especial <span className={styles.optional}>(opcional)</span></p>
              <textarea
                className={styles.notaInput}
                placeholder='Ej: "cambien el pan por lechuga", "sin sal en la sopa"…'
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                maxLength={200}
              />
              <p className={styles.notaCount}>{nota.length}/200</p>
            </div>
          </div>
        </div>

        {/* ── Footer fijo ── */}
        <div className={styles.footer}>
          {/* Cantidad */}
          <div className={styles.cantidadControl}>
            <button
              className={styles.cantBtn}
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              aria-label="Reducir"
            >−</button>
            <span className={styles.cantNum}>{cantidad}</span>
            <button
              className={styles.cantBtn}
              onClick={() => setCantidad((c) => c + 1)}
              aria-label="Aumentar"
            >+</button>
          </div>

          {/* CTA */}
          <button className={styles.addBtn} onClick={handleAgregar}>
            <span>Agregar al pedido</span>
            <span className={styles.addBtnPrice}>{formatPrecio(precioTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
