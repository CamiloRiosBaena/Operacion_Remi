import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { infoPedidoPorToken, confirmarEntregaConToken, type ApiPedido } from '@/features/admin/services/admin.service';
import styles from './ConfirmarEntregaPage.module.css';

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

type Estado = 'cargando' | 'listo' | 'confirmando' | 'confirmado' | 'error';

export function ConfirmarEntregaPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [pedido, setPedido]   = useState<ApiPedido | null>(null);
  const [estado, setEstado]   = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!token) { setEstado('error'); setMensaje('QR inválido: no se encontró el token.'); return; }
    infoPedidoPorToken(token)
      .then((p) => { setPedido(p); setEstado('listo'); })
      .catch((e: Error) => { setEstado('error'); setMensaje(e.message); });
  }, [token]);

  async function handleConfirmar() {
    if (!token) return;
    setEstado('confirmando');
    try {
      await confirmarEntregaConToken(token);
      setEstado('confirmado');
    } catch (e: unknown) {
      setEstado('error');
      setMensaje(e instanceof Error ? e.message : 'Error al confirmar la entrega');
    }
  }

  const tipoEmoji = pedido?.tipo === 'mesa' ? '🪑' : pedido?.tipo === 'llevar' ? '🥡' : '🛵';
  const tipoLabel = pedido?.tipo === 'mesa' ? 'en mesa' : pedido?.tipo === 'llevar' ? 'para llevar' : 'a domicilio';

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>{estado === 'cargando' ? '📦' : tipoEmoji}</div>
        <h1 className={styles.titulo}>
          {pedido ? `Confirmar entrega ${tipoLabel}` : 'Confirmar entrega'}
        </h1>

        {estado === 'cargando' && <p className={styles.info}>Cargando información del pedido…</p>}

        {estado === 'error' && (
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>✕</span>
            <p className={styles.errorMsg}>{mensaje || 'QR no válido o expirado.'}</p>
          </div>
        )}

        {(estado === 'listo' || estado === 'confirmando') && pedido && (
          <>
            <div className={styles.pedidoInfo}>
              <div className={styles.pedidoRow}>
                <span className={styles.pedidoLabel}>Pedido</span>
                <span className={styles.pedidoValor}>#{pedido.id}</span>
              </div>
              {pedido.cliente && (
                <div className={styles.pedidoRow}>
                  <span className={styles.pedidoLabel}>Cliente</span>
                  <span className={styles.pedidoValor}>{pedido.cliente.nombre}</span>
                </div>
              )}
              {pedido.direccionEntrega && (
                <div className={styles.pedidoRow}>
                  <span className={styles.pedidoLabel}>Dirección</span>
                  <span className={styles.pedidoValor}>{pedido.direccionEntrega}</span>
                </div>
              )}
              <div className={styles.pedidoRow}>
                <span className={styles.pedidoLabel}>Total</span>
                <span className={`${styles.pedidoValor} ${styles.total}`}>{formatPrecio(pedido.total)}</span>
              </div>
            </div>

            <ul className={styles.items}>
              {(pedido.detalles ?? []).map((d) => (
                <li key={d.id} className={styles.item}>
                  <span className={styles.itemCantidad}>{d.cantidad}×</span>
                  <span className={styles.itemNombre}>{d.plato.nombre}</span>
                  <span className={styles.itemSubtotal}>{formatPrecio(d.subtotal)}</span>
                </li>
              ))}
            </ul>

            <button
              className={styles.btnConfirmar}
              onClick={handleConfirmar}
              disabled={estado === 'confirmando'}
            >
              {estado === 'confirmando' ? 'Confirmando…' : '✓ Confirmar entrega'}
            </button>
          </>
        )}

        {estado === 'confirmado' && (
          <div className={styles.successBox}>
            <span className={styles.successIcon}>✓</span>
            <p className={styles.successMsg}>¡Entrega confirmada!</p>
            <p className={styles.successSub}>El pedido fue marcado como entregado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
