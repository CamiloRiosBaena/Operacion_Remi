import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { QRScannerModal } from '../components/QRScannerModal';
import {
  fetchPedidos,
  cambiarEstadoPedido,
  cancelarPedido,
  type ApiPedido,
  type EstadoPedidoApi,
  type TipoPedidoApi,
} from '../services/admin.service';
import styles from './PedidosAdmin.module.css';

// ── Mapeo de estados ──────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<EstadoPedidoApi, string> = {
  pendiente:  'Recibido',
  en_cocina:  'En preparación',
  listo:      'Listo',
  en_camino:  'En camino',
  entregado:  'Entregado',
  cancelado:  'Cancelado',
};

const ESTADO_COLOR: Record<EstadoPedidoApi, string> = {
  pendiente:  '#3b82f6',
  en_cocina:  '#d97706',
  listo:      '#16a34a',
  en_camino:  '#0369a1',
  entregado:  '#78716c',
  cancelado:  '#b91c1c',
};

// Siguiente estado lógico para cada estado
const SIGUIENTE_ESTADO: Partial<Record<EstadoPedidoApi, EstadoPedidoApi>> = {
  pendiente: 'en_cocina',
  en_cocina: 'listo',
  listo:     'entregado',
  en_camino: 'entregado',
};

const ESTADOS_FILTRO: (EstadoPedidoApi | 'todos')[] = [
  'todos', 'pendiente', 'en_cocina', 'listo', 'en_camino', 'entregado', 'cancelado',
];

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function labelCliente(p: ApiPedido) {
  if (p.tipo === 'mesa' && p.mesa) return `Mesa ${p.mesa.numero}`;
  if (p.cliente) return p.cliente.nombre;
  return 'Invitado';
}

export function PedidosAdmin() {
  const [pedidos, setPedidos]           = useState<ApiPedido[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedidoApi | 'todos'>('todos');
  const [filtroTipo, setFiltroTipo]     = useState<TipoPedidoApi | 'todos'>('todos');
  const [accionando, setAccionando]     = useState<number | null>(null);
  const [detalle, setDetalle]           = useState<ApiPedido | null>(null);
  const [scanPedido, setScanPedido]     = useState<ApiPedido | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    fetchPedidos()
      .then(setPedidos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pedidosFiltrados = pedidos.filter((p) => {
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const matchTipo   = filtroTipo   === 'todos' || p.tipo   === filtroTipo;
    return matchEstado && matchTipo;
  });

  const totalVisible = pedidosFiltrados
    .filter((p) => p.estado !== 'cancelado')
    .reduce((s, p) => s + Number(p.total), 0);

  async function avanzarEstado(p: ApiPedido) {
    const siguiente = SIGUIENTE_ESTADO[p.estado];
    if (!siguiente) return;
    setAccionando(p.id);
    try {
      const actualizado = await cambiarEstadoPedido(p.id, siguiente);
      setPedidos((prev) => prev.map((x) => (x.id === p.id ? actualizado : x)));
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(null);
    }
  }

  function handleConfirmadoQr(pedidoId: number) {
    setPedidos((prev) =>
      prev.map((x) => x.id === pedidoId ? { ...x, estado: 'entregado' as EstadoPedidoApi } : x),
    );
    setScanPedido(null);
  }

  async function handleCancelar(p: ApiPedido) {
    if (!confirm(`¿Cancelar pedido #${p.id}?`)) return;
    setAccionando(p.id);
    try {
      const actualizado = await cancelarPedido(p.id);
      setPedidos((prev) => prev.map((x) => (x.id === p.id ? actualizado : x)));
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(null);
    }
  }

  const conteo = (e: EstadoPedidoApi) => pedidos.filter((p) => p.estado === e).length;

  return (
    <AdminLayout title="Pedidos">
      <div className={styles.wrapper}>

        {/* Resumen rápido */}
        <div className={styles.summary}>
          {(['pendiente', 'en_cocina', 'listo'] as EstadoPedidoApi[]).map((estado) => (
            <div
              key={estado}
              className={styles.summaryCard}
              style={{ borderTopColor: ESTADO_COLOR[estado] }}
              onClick={() => setFiltroEstado(estado)}
            >
              <p className={styles.summaryCount} style={{ color: ESTADO_COLOR[estado] }}>
                {loading ? '…' : conteo(estado)}
              </p>
              <p className={styles.summaryLabel}>{ESTADO_LABEL[estado]}</p>
            </div>
          ))}
          <div className={styles.summaryCard} style={{ borderTopColor: '#1c1917' }}>
            <p className={styles.summaryCount}>
              {loading ? '…' : formatPrecio(totalVisible)}
            </p>
            <p className={styles.summaryLabel}>Total (visible)</p>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.toolbar}>
          <div className={styles.filtroGroup}>
            <span className={styles.filtroLabel}>Estado:</span>
            {ESTADOS_FILTRO.map((e) => (
              <button
                key={e}
                className={`${styles.filtroChip} ${filtroEstado === e ? styles.filtroActive : ''}`}
                style={filtroEstado === e && e !== 'todos' ? { background: ESTADO_COLOR[e], borderColor: ESTADO_COLOR[e] } : {}}
                onClick={() => setFiltroEstado(e)}
              >
                {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
              </button>
            ))}
          </div>
          <div className={styles.filtroGroup}>
            <span className={styles.filtroLabel}>Tipo:</span>
            {(['todos', 'mesa', 'domicilio', 'llevar'] as const).map((t) => (
              <button
                key={t}
                className={`${styles.filtroChip} ${filtroTipo === t ? styles.filtroActive : ''}`}
                onClick={() => setFiltroTipo(t)}
              >
                {t === 'todos' ? 'Todos' : t === 'mesa' ? '🪑 Mesa' : t === 'domicilio' ? '🛵 Domicilio' : '🥡 Llevar'}
              </button>
            ))}
          </div>
          <button className={styles.btnRefresh} onClick={cargar}>↻ Actualizar</button>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#78716c' }}>Cargando pedidos…</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#a8a29e' }}>No hay pedidos con ese filtro</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente / Mesa</th>
                  <th>Tipo</th>
                  <th>Platos</th>
                  <th>Total</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => {
                  const siguiente = SIGUIENTE_ESTADO[p.estado];
                  const enAccion  = accionando === p.id;
                  return (
                    <tr key={p.id} className={p.estado === 'cancelado' ? styles.rowCancelada : ''}>
                      <td><span className={styles.pedidoId}>#{p.id}</span></td>
                      <td className={styles.cliente}>{labelCliente(p)}</td>
                      <td>
                        <span className={`${styles.tipoBadge} ${p.tipo === 'mesa' ? styles.tipoMesa : p.tipo === 'domicilio' ? styles.tipoDomicilio : styles.tipoLlevar}`}>
                          {p.tipo === 'mesa' ? '🪑 Mesa' : p.tipo === 'domicilio' ? '🛵 Domicilio' : '🥡 Llevar'}
                        </span>
                      </td>
                      <td className={styles.items}>
                        <button className={styles.btnDetalle} onClick={() => setDetalle(p)}>
                          {p.detalles?.length ?? 0} plato(s) 🔍
                        </button>
                      </td>
                      <td className={styles.total}>{formatPrecio(p.total)}</td>
                      <td className={styles.hora}>{formatHora(p.fechaHora)}</td>
                      <td>
                        <span
                          className={styles.estadoBadge}
                          style={{ background: `${ESTADO_COLOR[p.estado]}18`, color: ESTADO_COLOR[p.estado] }}
                        >
                          {ESTADO_LABEL[p.estado]}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {siguiente && !(p.estado === 'listo' && (p.tipo === 'mesa' || p.tipo === 'llevar')) && (
                            <button
                              className={styles.btnAvanzar}
                              onClick={() => avanzarEstado(p)}
                              disabled={enAccion}
                              style={{ background: ESTADO_COLOR[siguiente] }}
                            >
                              {enAccion ? '…' : `→ ${ESTADO_LABEL[siguiente]}`}
                            </button>
                          )}
                          {p.estado === 'listo' && (p.tipo === 'mesa' || p.tipo === 'llevar') && (
                            <button
                              className={styles.btnQrEntrega}
                              onClick={() => setScanPedido(p)}
                            >
                              📷 Escanear QR
                            </button>
                          )}
                          {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                            <button className={styles.btnCancelar} onClick={() => handleCancelar(p)} disabled={enAccion}>
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className={styles.count}>{pedidosFiltrados.length} pedido(s)</p>
      </div>

      {/* Modal escáner QR */}
      {scanPedido && (
        <QRScannerModal
          pedidoId={scanPedido.id}
          onConfirmado={handleConfirmadoQr}
          onClose={() => setScanPedido(null)}
        />
      )}

      {/* Modal detalle */}
      {detalle && (
        <div className={styles.modalOverlay} onClick={() => setDetalle(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Pedido #{detalle.id} — {labelCliente(detalle)}</h3>
            <ul className={styles.detalleList}>
              {detalle.detalles?.map((d) => (
                <li key={d.id} className={styles.detalleItem}>
                  <span className={styles.detalleNombre}>{d.plato.nombre}</span>
                  <span className={styles.detalleCantidad}>×{d.cantidad}</span>
                  <span className={styles.detalleSubtotal}>{formatPrecio(d.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className={styles.detalleTotalRow}>
              <span>Total</span>
              <span className={styles.detalleTotal}>{formatPrecio(detalle.total)}</span>
            </div>
            {detalle.direccionEntrega && (
              <p className={styles.detalleDireccion}>📍 {detalle.direccionEntrega}</p>
            )}
            <button className={styles.btnCerrarModal} onClick={() => setDetalle(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
