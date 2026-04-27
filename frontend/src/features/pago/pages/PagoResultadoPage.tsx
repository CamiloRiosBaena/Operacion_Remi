import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { confirmarPago, type ConfirmarPagoResponse } from '../services/pagos.service';
import { fetchQrTokenPublico } from '@/features/pedidos/services/pedidos.service';
import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { setActivePedido } from '@/shared/lib/guestSession';
import styles from './PagoResultadoPage.module.css';

type Estado = 'verificando' | 'aprobado' | 'rechazado' | 'pendiente' | 'error';

export function PagoResultadoPage() {
  const [searchParams]        = useSearchParams();
  const { clearCart }         = useCarrito();
  const { user }              = useAuth();
  const [estado, setEstado]   = useState<Estado>('verificando');
  const [data, setData]       = useState<ConfirmarPagoResponse | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const confirmado = useRef(false);

  useEffect(() => {
    if (confirmado.current) return;
    confirmado.current = true;

    // Mercado Pago redirige con estos params:
    // ?collection_id=...&collection_status=approved&payment_id=...&status=approved&...
    const paymentId = searchParams.get('payment_id');
    const status    = searchParams.get('status'); // approved | rejected | pending | in_process

    if (!paymentId) {
      setEstado('error');
      setMensaje('No se encontró el ID de pago en la URL.');
      return;
    }

    // Si MP ya nos dice que está rechazado, podemos fallar rápido sin llamar al backend
    if (status === 'rejected') {
      setEstado('rechazado');
      setMensaje('Tu transacción fue rechazada por Mercado Pago.');
      return;
    }

    if (status === 'pending' || status === 'in_process') {
      setEstado('pendiente');
      setMensaje('Tu pago está siendo procesado por Mercado Pago.');
      return;
    }

    // status === 'approved' → confirmar con el backend
    confirmarPago(paymentId)
      .then((res) => {
        setData(res);
        setEstado('aprobado');
        clearCart();
        setActivePedido({ id: res.pedidoId, tipo: res.tipo, estado: res.estado, clienteId: user?.id });
        fetchQrTokenPublico(res.pedidoId)
          .then(({ token }) => setQrToken(token))
          .catch(console.error);
      })
      .catch((err: Error) => {
        const msg = err.message ?? '';
        // El backend puede rechazar aunque MP diga approved (ej: monto no coincide)
        if (msg.toLowerCase().includes('rechazado') || msg.toLowerCase().includes('rejected')) {
          setEstado('rechazado');
          setMensaje(msg);
        } else {
          setEstado('error');
          setMensaje(msg || 'Ocurrió un error al verificar el pago.');
        }
      });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ── Verificando ── */}
        {estado === 'verificando' && (
          <>
            <div className={styles.spinner} />
            <h1 className={styles.title}>Verificando pago…</h1>
            <p className={styles.sub}>Estamos confirmando tu transacción con Mercado Pago.</p>
          </>
        )}

        {/* ── Aprobado ── */}
        {estado === 'aprobado' && data && (
          <>
            <div className={styles.iconWrap}>
              <svg className={styles.iconCheck} viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="26" fill="#22c55e" />
                <path d="M14 26l8 8 16-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className={styles.title}>¡Pago aprobado!</h1>
            <p className={styles.sub}>Tu pedido ya está en cocina 🍳</p>

            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Pedido</span>
                <span className={styles.infoVal}>#{data.pedidoId}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total pagado</span>
                <span className={styles.infoVal}>
                  ${Number(data.total).toLocaleString('es-CO')}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tipo</span>
                <span className={styles.infoVal}>
                  {data.tipo === 'mesa'      ? '🪑 En mesa'
                   : data.tipo === 'domicilio' ? '🛵 Domicilio'
                   : '🥡 Para llevar'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Referencia</span>
                <span className={`${styles.infoVal} ${styles.infoRef}`}>{data.referencia}</span>
              </div>
            </div>

            {qrToken && (
              <div className={styles.qrSection}>
                <p className={styles.qrLabel}>
                  Muestra este QR cuando te entreguen el pedido
                </p>
                <div className={styles.qrBox}>
                  <QRCodeSVG
                    value={`${window.location.origin}/confirmar-entrega?token=${qrToken}`}
                    size={200}
                    level="M"
                  />
                </div>
              </div>
            )}

            <Link to="/menu" className={styles.btnPrimary}>
              Seguir el pedido en el menú →
            </Link>
          </>
        )}

        {/* ── Pendiente ── */}
        {(estado === 'pendiente') && (
          <>
            <div className={styles.iconWrap}>
              <svg className={styles.iconCheck} viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="26" fill="#f59e0b" />
                <path d="M26 16v10l6 6" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className={styles.title}>Pago en proceso</h1>
            <p className={styles.sub}>{mensaje}</p>
            <p className={styles.hint}>
              Mercado Pago puede demorar unos minutos en confirmar. Te notificaremos
              cuando el pedido esté listo.
            </p>
            <Link to="/menu" className={styles.btnSecondary}>Volver al menú</Link>
          </>
        )}

        {/* ── Rechazado ── */}
        {estado === 'rechazado' && (
          <>
            <div className={styles.iconWrap}>
              <svg className={styles.iconX} viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="26" fill="#ef4444" />
                <path d="M17 17l18 18M35 17L17 35" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className={styles.title}>Pago no aprobado</h1>
            <p className={styles.sub}>{mensaje || 'Tu transacción fue rechazada o está pendiente.'}</p>
            <p className={styles.hint}>Puedes intentarlo nuevamente con otro método de pago.</p>
            <Link to="/menu" className={styles.btnSecondary}>Volver al menú</Link>
          </>
        )}

        {/* ── Error ── */}
        {estado === 'error' && (
          <>
            <div className={styles.iconWrap}>
              <span className={styles.iconEmoji}>⚠️</span>
            </div>
            <h1 className={styles.title}>Algo salió mal</h1>
            <p className={styles.sub}>{mensaje}</p>
            <p className={styles.hint}>
              Si realizaste el pago y ves este error, guarda el ID de pago de
              Mercado Pago y contáctanos. Tu dinero está seguro.
            </p>
            <Link to="/menu" className={styles.btnSecondary}>Volver al menú</Link>
          </>
        )}

      </div>
    </div>
  );
}