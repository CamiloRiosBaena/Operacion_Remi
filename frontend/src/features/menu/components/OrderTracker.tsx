/**
 * OrderTracker.tsx
 * Widget que se muestra en el menú principal (debajo del banner) mientras
 * el cliente tiene un pedido activo. Actualiza el estado en tiempo real
 * via Supabase Realtime.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActivePedido, clearActivePedido, type ActivePedido } from '@/shared/lib/guestSession';
import { useOrderTracking, type EstadoPedido } from '@/shared/hooks/useOrderTracking';
import { cancelarPedidoPublico } from '@/features/pedidos/services/pedidos.service';
import styles from './OrderTracker.module.css';

// ─────────────────────────────────────────────
// Config de pasos visuales
// ─────────────────────────────────────────────

interface Paso {
  estado: EstadoPedido;
  label: string;
  emoji: string;
  labelCorto: string;
}

const PASOS_MESA_LLEVAR: Paso[] = [
  { estado: 'pendiente', label: 'Recibido',     emoji: '📋', labelCorto: 'Recibido'  },
  { estado: 'en_cocina', label: 'En cocina',    emoji: '🍳', labelCorto: 'Cocina'    },
  { estado: 'listo',     label: '¡Listo!',      emoji: '✅', labelCorto: 'Listo'     },
  { estado: 'entregado', label: 'Entregado',    emoji: '🎉', labelCorto: 'Entregado' },
];

const PASOS_DOMICILIO: Paso[] = [
  { estado: 'pendiente',  label: 'Recibido',     emoji: '📋', labelCorto: 'Recibido'  },
  { estado: 'en_cocina',  label: 'En cocina',    emoji: '🍳', labelCorto: 'Cocina'    },
  { estado: 'listo',      label: '¡Listo!',      emoji: '✅', labelCorto: 'Listo'     },
  { estado: 'en_camino',  label: 'En camino',    emoji: '🛵', labelCorto: 'Camino'    },
  { estado: 'entregado',  label: 'Entregado',    emoji: '🎉', labelCorto: 'Entregado' },
];

const ORDEN_ESTADOS: EstadoPedido[] = [
  'pendiente', 'en_cocina', 'listo', 'en_camino', 'entregado',
];

function getPasos(tipo: 'mesa' | 'domicilio' | 'llevar'): Paso[] {
  return tipo === 'domicilio' ? PASOS_DOMICILIO : PASOS_MESA_LLEVAR;
}

function getIndexActual(estado: EstadoPedido, pasos: Paso[]): number {
  const idx = pasos.findIndex((p) => p.estado === estado);
  return idx === -1 ? 0 : idx;
}

function getTipoLabel(tipo: 'mesa' | 'domicilio' | 'llevar'): string {
  if (tipo === 'mesa')      return '🪑 En mesa';
  if (tipo === 'domicilio') return '🛵 Domicilio';
  return '🥡 Para llevar';
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

interface OrderTrackerProps {
  /** ID inicial del pedido activo (desde localStorage). Null = no mostrar */
  pedidoId: number | null;
  onClose?: () => void;
}

export function OrderTracker({ pedidoId, onClose }: OrderTrackerProps) {
  const { data, loading, error } = useOrderTracking(pedidoId);
  const [prevEstado, setPrevEstado] = useState<EstadoPedido | null>(null);
  const [animating, setAnimating]   = useState(false);
  const [canceling, setCanceling]   = useState(false);

  // Animar cuando cambia el estado
  useEffect(() => {
    if (data && prevEstado && data.estado !== prevEstado) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), 700);
      return () => clearTimeout(t);
    }
    if (data) setPrevEstado(data.estado);
  }, [data?.estado]);

  if (!pedidoId) return null;

  if (loading && !data) {
    return (
      <div className={styles.tracker}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonBar} />
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const cancelado = data.estado === 'cancelado';
  const entregado = data.estado === 'entregado';
  const terminal  = cancelado || entregado;

  const pasos     = getPasos(data.tipo);
  const idxActual = cancelado ? -1 : getIndexActual(data.estado, pasos);

  function handleDismiss() {
    clearActivePedido();
    onClose?.();
  }

  async function handleCancelar() {
    if (!data || !confirm('¿Seguro que quieres cancelar tu pedido?')) return;
    setCanceling(true);
    try {
      await cancelarPedidoPublico(data.id);
    } catch {
      alert('No se pudo cancelar el pedido. Intenta de nuevo.');
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className={`${styles.tracker} ${animating ? styles.trackerPulse : ''} ${terminal ? styles.trackerTerminal : ''}`}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>Tu pedido #{data.id}</span>
          <span className={styles.tipoBadge}>{getTipoLabel(data.tipo)}</span>
        </div>
        <div className={styles.headerRight}>
          {terminal && (
            <button className={styles.btnDismiss} onClick={handleDismiss} aria-label="Cerrar seguimiento">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Cancelado ── */}
      {cancelado && (
        <div className={styles.canceladoBox}>
          <span className={styles.canceladoEmoji}>❌</span>
          <p className={styles.canceladoText}>Pedido cancelado</p>
          <button className={styles.btnDismiss2} onClick={handleDismiss}>Cerrar</button>
        </div>
      )}

      {/* ── Barra de progreso ── */}
      {!cancelado && (
        <>
          <div className={styles.progressWrap}>
            {/* Línea de fondo */}
            <div className={styles.progressLine} />
            {/* Línea de avance */}
            <div
              className={styles.progressFill}
              style={{
                width: pasos.length > 1
                  ? `${(idxActual / (pasos.length - 1)) * 100}%`
                  : '0%',
              }}
            />
            {/* Puntos */}
            {pasos.map((paso, i) => {
              const done    = i <= idxActual;
              const current = i === idxActual;
              return (
                <div key={paso.estado} className={styles.step} style={{ left: `${(i / (pasos.length - 1)) * 100}%` }}>
                  <div className={`${styles.dot} ${done ? styles.dotDone : ''} ${current ? styles.dotCurrent : ''}`}>
                    {done ? <span className={styles.dotEmoji}>{paso.emoji}</span> : null}
                  </div>
                  <span className={`${styles.stepLabel} ${current ? styles.stepLabelActive : ''}`}>
                    {paso.labelCorto}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Estado actual ── */}
          <div className={styles.estadoActual}>
            <span className={styles.estadoEmoji}>{pasos[idxActual]?.emoji}</span>
            <div>
              <p className={styles.estadoLabel}>{pasos[idxActual]?.label}</p>
              {data.estado === 'pendiente' && (
                <p className={styles.estadoSub}>Confirmando con cocina…</p>
              )}
              {data.estado === 'en_cocina' && (
                <p className={styles.estadoSub}>¡Los cocineros están en ello!</p>
              )}
              {data.estado === 'listo' && data.tipo !== 'domicilio' && (
                <p className={styles.estadoSub}>Pasa a recogerlo o espera en tu mesa</p>
              )}
              {data.estado === 'listo' && data.tipo === 'domicilio' && (
                <p className={styles.estadoSub}>Pronto saldrá a domicilio</p>
              )}
              {data.estado === 'en_camino' && (
                <p className={styles.estadoSub}>¡El repartidor ya viene!</p>
              )}
              {data.estado === 'entregado' && (
                <p className={styles.estadoSub}>¡Buen provecho! 🎉</p>
              )}
            </div>
          </div>

          {/* ── QR de entrega ── visible mientras no esté entregado */}
          {!entregado && (
            <Link to={`/mi-pedido/${data.id}`} className={styles.btnVerQr}>
              📱 Ver mi QR de entrega
            </Link>
          )}

          {/* ── Cancelar pedido ── solo disponible mientras está pendiente */}
          {data.estado === 'pendiente' && (
            <button
              className={styles.btnCancelar}
              onClick={handleCancelar}
              disabled={canceling}
            >
              {canceling ? 'Cancelando…' : 'Cancelar pedido'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
