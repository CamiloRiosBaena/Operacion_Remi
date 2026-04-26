import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/shared/components/AppShell';
import { fetchPedidosDomiciliario, marcarEntregado } from '../services/domicilios.service';
import type { ApiPedido } from '@/features/admin/services/admin.service';
import styles from './DomiciliosDashboard.module.css';

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

export function DomiciliosDashboard() {
  const [pedidos,      setPedidos     ] = useState<ApiPedido[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [connected,    setConnected   ] = useState(false);
  const [confirmando,  setConfirmando ] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await fetchPedidosDomiciliario();
      setPedidos(data);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    intervalRef.current = setInterval(cargar, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cargar]);

  async function handleEntregado(pedido: ApiPedido) {
    setConfirmando(pedido.id);
    try {
      await marcarEntregado(pedido.id);
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmando(null);
    }
  }

  return (
    <AppShell title="Mis Entregas">
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <p className={styles.info}>
            {loading
              ? 'Conectando…'
              : connected
              ? `${pedidos.length} entrega${pedidos.length !== 1 ? 's' : ''} asignada${pedidos.length !== 1 ? 's' : ''} · se actualiza cada 5 s`
              : 'Error al conectar con el servidor'}
          </p>
          <span
            className={styles.counter}
            style={connected
              ? { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }
              : undefined}
          >
            {connected ? '🟢 Conectado' : '🔴 Sin conexión'}
          </span>
        </div>

        <div className={styles.list}>
          {!loading && pedidos.length === 0 && (
            <div className={styles.empty}>
              <span>🛵</span>
              <p>No tienes entregas asignadas por ahora.</p>
            </div>
          )}

          {pedidos.map((pedido) => {
            const enAccion = confirmando === pedido.id;
            return (
              <div key={pedido.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardId}>
                    <span className={styles.pedidoId}>#{pedido.id}</span>
                    <span className={styles.hora}>{formatHora(pedido.fechaHora)}</span>
                  </div>
                  <span
                    className={styles.estado}
                    style={{ background: '#d9770618', color: '#d97706' }}
                  >
                    En camino
                  </span>
                </div>

                <div className={styles.clienteInfo}>
                  {pedido.cliente && (
                    <span className={styles.clienteNombre}>👤 {pedido.cliente.nombre}</span>
                  )}
                  {pedido.direccionEntrega && (
                    <span className={styles.clienteDir}>📍 {pedido.direccionEntrega}</span>
                  )}
                </div>

                <ul className={styles.items}>
                  {(pedido.detalles ?? []).map((d) => (
                    <li key={d.id}>
                      <strong>{d.cantidad}×</strong> {d.plato.nombre}
                    </li>
                  ))}
                </ul>

                <div className={styles.actions}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d4500a' }}>
                    {formatPrecio(pedido.total)}
                  </span>
                  <button
                    className={styles.btnEstado}
                    onClick={() => handleEntregado(pedido)}
                    disabled={enAccion}
                  >
                    {enAccion ? '…' : '✓ Confirmar entrega'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}