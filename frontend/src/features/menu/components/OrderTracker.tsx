import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getActivePedido, clearActivePedido } from '@/shared/lib/guestSession';
import { useOrderTracking, type EstadoPedido } from '@/shared/hooks/useOrderTracking';
import { cancelarPedidoPublico, fetchQrTokenPublico } from '@/features/pedidos/services/pedidos.service';
import styles from './OrderTracker.module.css';

/* ── Iconos SVG inline ── */
function IcoRecibo()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v4h4M9 11h6M9 15h6"/></svg>; }
function IcoCocina()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3 .5 2 2 2 2 2s-1-4 2-8Z"/></svg>; }
function IcoListo()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5 11 15.5 16 9.5"/></svg>; }
function IcoCamino()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/></svg>; }
function IcoEntregado(){ return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>; }
function IcoQr()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="7" width="4" height="4" rx="1"/><rect x="7" y="13" width="4" height="4" rx="1"/></svg>; }
function IcoTrash()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>; }
function IcoClose()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IcoPedido()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M9 11h6M9 15h4"/></svg>; }
function IcoTipo({ tipo }: { tipo: string }) {
  if (tipo === 'mesa')      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9h16M5 9 4 4M19 9l1-5M7 9v11M17 9v11M9.5 9v5h5V9"/></svg>;
  if (tipo === 'domicilio') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>;
}

/* ── Pasos ── */
interface Paso { estado: EstadoPedido; label: string; labelCorto: string; Ico: () => JSX.Element; }

const PASOS_MESA_LLEVAR: Paso[] = [
  { estado: 'pendiente', label: 'Recibido',   labelCorto: 'Recibido',   Ico: IcoRecibo   },
  { estado: 'en_cocina', label: 'En cocina',  labelCorto: 'Cocina',     Ico: IcoCocina   },
  { estado: 'listo',     label: '¡Listo!',    labelCorto: 'Listo',      Ico: IcoListo    },
  { estado: 'entregado', label: 'Entregado',  labelCorto: 'Entregado',  Ico: IcoEntregado },
];
const PASOS_DOMICILIO: Paso[] = [
  { estado: 'pendiente',  label: 'Recibido',  labelCorto: 'Recibido',  Ico: IcoRecibo    },
  { estado: 'en_cocina',  label: 'En cocina', labelCorto: 'Cocina',    Ico: IcoCocina    },
  { estado: 'listo',      label: '¡Listo!',   labelCorto: 'Listo',     Ico: IcoListo     },
  { estado: 'en_camino',  label: 'En camino', labelCorto: 'Camino',    Ico: IcoCamino    },
  { estado: 'entregado',  label: 'Entregado', labelCorto: 'Entregado', Ico: IcoEntregado },
];

function getTipoLabel(tipo: string) {
  if (tipo === 'mesa')      return 'En mesa';
  if (tipo === 'domicilio') return 'Domicilio';
  return 'Para llevar';
}

function getStatusSub(estado: EstadoPedido, tipo: string): [string, boolean] {
  if (estado === 'pendiente')               return ['Confirmando con cocina', true];
  if (estado === 'en_cocina')               return ['¡Los cocineros están en ello!', true];
  if (estado === 'listo' && tipo !== 'domicilio') return ['¡Tu pedido está listo! Acércate a recogerlo', false];
  if (estado === 'listo')                   return ['Pronto saldrá a domicilio', false];
  if (estado === 'en_camino')               return ['¡El repartidor ya viene!', false];
  if (estado === 'entregado')               return ['¡Buen provecho!', false];
  return ['', false];
}

/* ── Componente ── */
interface Props { pedidoId: number | null; onClose?: () => void; }

export function OrderTracker({ pedidoId, onClose }: Props) {
  const { data, loading, error } = useOrderTracking(pedidoId);
  const [prevEstado, setPrevEstado] = useState<EstadoPedido | null>(null);
  const [animating, setAnimating]   = useState(false);
  const [canceling,       setCanceling      ] = useState(false);
  const [confirmCancel,   setConfirmCancel  ] = useState(false);
  const [showQr,    setShowQr    ]  = useState(false);
  const [qrToken,   setQrToken   ]  = useState<string | null>(null);
  const [qrLoading, setQrLoading ]  = useState(false);
  const [qrError,   setQrError   ]  = useState('');

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
  const pasos     = data.tipo === 'domicilio' ? PASOS_DOMICILIO : PASOS_MESA_LLEVAR;
  const idxActual = cancelado ? -1 : pasos.findIndex(p => p.estado === data.estado);
  const fillPct   = pasos.length > 1 && idxActual >= 0
    ? `${(idxActual / (pasos.length - 1)) * 88 + 11}%`
    : '11%';

  const CurrentIco = idxActual >= 0 ? pasos[idxActual].Ico : IcoRecibo;
  const [statusSub, hasAnim] = getStatusSub(data.estado, data.tipo);

  function handleDismiss() { clearActivePedido(); onClose?.(); }

  async function handleVerQr() {
    if (!data) return;
    setShowQr(true);
    if (qrToken) return; // ya cargado
    setQrLoading(true);
    setQrError('');
    try {
      const { token } = await fetchQrTokenPublico(data.id);
      setQrToken(token);
    } catch (e: unknown) {
      setQrError(e instanceof Error ? e.message : 'No se pudo obtener el QR');
    } finally {
      setQrLoading(false);
    }
  }

  async function handleCancelar() {
    if (!data) return;
    setCanceling(true);
    setConfirmCancel(false);
    try { await cancelarPedidoPublico(data.id); }
    catch { /* el estado se actualiza por realtime */ }
    finally { setCanceling(false); }
  }

  return (
    <div className={`${styles.tracker} ${animating ? styles.trackerPulse : ''} ${terminal ? styles.trackerTerminal : ''}`}>

      {/* ── Head ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>
            <IcoPedido /> Tu pedido #{data.id}
          </span>
          <span className={styles.tipoBadge}>
            <IcoTipo tipo={data.tipo} /> {getTipoLabel(data.tipo)}
          </span>
        </div>
        <div className={styles.headerRight}>
          {terminal && (
            <button className={styles.btnDismiss} onClick={handleDismiss} aria-label="Cerrar">
              <IcoClose />
            </button>
          )}
        </div>
      </div>

      {/* ── Cancelado ── */}
      {cancelado && (
        <div className={styles.canceladoBox}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="oklch(0.58 0.155 25)" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M15 9 9 15M9 9l6 6"/></svg>
          <p className={styles.canceladoText}>Pedido cancelado</p>
          <button className={styles.btnDismiss2} onClick={handleDismiss}>Cerrar</button>
        </div>
      )}

      {/* ── Stepper + estado + acciones ── */}
      {!cancelado && (
        <>
          {/* Stepper */}
          <div className={styles.stepper} style={{ gridTemplateColumns: `repeat(${pasos.length}, 1fr)` }}>
            <div className={styles.stepperLine} />
            <div className={styles.stepperFill} style={{ width: fillPct }} />
            {pasos.map((paso, i) => {
              const done    = i < idxActual;
              const current = i === idxActual;
              return (
                <div
                  key={paso.estado}
                  className={`${styles.step} ${done ? styles.stepDone : ''} ${current ? styles.stepCurrent : ''}`}
                >
                  <div className={styles.stepDot}><paso.Ico /></div>
                  <span className={`${styles.stepLabel} ${current ? styles.stepLabelActive : ''}`}>
                    {paso.labelCorto}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Estado actual */}
          <div className={styles.estadoActual}>
            <div className={styles.estadoIco}><CurrentIco /></div>
            <div>
              <p className={styles.estadoLabel}>{pasos[idxActual]?.label ?? 'Recibido'}</p>
              {statusSub && (
                <p className={styles.estadoSub}>
                  {statusSub}
                  {hasAnim && <span className={styles.estadoDots} />}
                </p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className={styles.acciones}>
            {!entregado && (
              <button className={styles.btnQr} onClick={handleVerQr}>
                <IcoQr /> Ver mi QR de entrega
              </button>
            )}
            {data.estado === 'pendiente' && !confirmCancel && (
              <button className={styles.btnCancelar} onClick={() => setConfirmCancel(true)} disabled={canceling}>
                <IcoTrash /> {canceling ? 'Cancelando…' : 'Cancelar pedido'}
              </button>
            )}
          </div>

          {/* Confirmación de cancelación — inline */}
          {confirmCancel && (
            <div className={styles.cancelConfirm}>
              <p className={styles.cancelConfirmText}>
                ¿Seguro que quieres cancelar tu pedido? Esta acción no se puede deshacer.
              </p>
              <div className={styles.cancelConfirmBtns}>
                <button className={styles.cancelConfirmNo} onClick={() => setConfirmCancel(false)}>
                  No, seguir
                </button>
                <button className={styles.cancelConfirmYes} onClick={handleCancelar} disabled={canceling}>
                  <IcoTrash /> {canceling ? 'Cancelando…' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* QR flotante — portal para salir del overflow:hidden del tracker */}
      {showQr && createPortal(
        <div className={styles.qrOverlay} onClick={() => setShowQr(false)}>
          <div className={styles.qrCard} onClick={e => e.stopPropagation()}>
            <p className={styles.qrCardTitle}>Tu QR de entrega</p>
            <p className={styles.qrCardSub}>Muéstralo cuando recojas o te entreguen tu pedido</p>

            {qrLoading && (
              <div className={styles.qrLoading}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Cargando QR…
              </div>
            )}
            {qrError && <p className={styles.qrError}>{qrError}</p>}
            {!qrLoading && qrToken && (
              <div className={styles.qrBox}>
                <QRCodeSVG
                  value={`${window.location.origin}/confirmar-entrega?token=${qrToken}`}
                  size={200}
                  level="M"
                />
              </div>
            )}

            <span className={styles.qrValidity}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              Válido por 4 horas
            </span>

            <button className={styles.btnQrClose} onClick={() => setShowQr(false)}>
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
