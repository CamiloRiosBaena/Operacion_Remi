import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import {
  fetchPedidos, fetchStaff, cambiarEstadoPedido,
  type ApiPedido, type ApiStaff, type EstadoPedidoApi,
} from '../services/admin.service';
import styles from './DomiciliosAdmin.module.css';

// Solo estos estados son relevantes para domicilios
type EstadoEntrega = 'pendiente' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';

const ESTADO_LABEL: Record<EstadoEntrega, string> = {
  pendiente: 'Pendiente',
  listo:     'Listo para despachar',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_COLOR: Record<EstadoEntrega, string> = {
  pendiente: '#3b82f6',
  listo:     '#16a34a',
  en_camino: '#d97706',
  entregado: '#78716c',
  cancelado: '#b91c1c',
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

const ESTADOS_DOMICILIO: EstadoEntrega[] = ['pendiente', 'listo', 'en_camino', 'entregado', 'cancelado'];

export function DomiciliosAdmin() {
  const [pedidos,       setPedidos      ] = useState<ApiPedido[]>([]);
  const [domiciliarios, setDomiciliarios] = useState<ApiStaff[]>([]);
  const [loading,       setLoading      ] = useState(true);
  const [accionando,    setAccionando   ] = useState<number | null>(null);
  const [filtroEstado,  setFiltroEstado ] = useState<EstadoEntrega | 'todos'>('todos');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [todos, staff] = await Promise.all([fetchPedidos(), fetchStaff()]);
      setPedidos(todos.filter((p) => p.tipo === 'domicilio'));
      setDomiciliarios(staff.filter((s) => s.rol === 'domiciliario' && s.estado === 'activo'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const entregasFiltradas = filtroEstado === 'todos'
    ? pedidos
    : pedidos.filter((p) => p.estado === filtroEstado);

  const conteo = (estado: EstadoEntrega) => pedidos.filter((p) => p.estado === estado).length;

  async function despacharPedido(pedido: ApiPedido, domiciliarioId: number) {
    setAccionando(pedido.id);
    try {
      const actualizado = await cambiarEstadoPedido(pedido.id, 'en_camino', domiciliarioId);
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? actualizado : p)));
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(null);
    }
  }

  async function marcarEntregado(pedido: ApiPedido) {
    setAccionando(pedido.id);
    try {
      const actualizado = await cambiarEstadoPedido(pedido.id, 'entregado');
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? actualizado : p)));
    } catch (err) {
      console.error(err);
    } finally {
      setAccionando(null);
    }
  }

  return (
    <AdminLayout title="Gestión de Domicilios">
      <div className={styles.wrapper}>

        {/* KPIs */}
        <div className={styles.kpiRow}>
          {(['pendiente', 'en_camino', 'entregado'] as EstadoEntrega[]).map((estado) => (
            <div
              key={estado}
              className={styles.kpiCard}
              style={{ borderTopColor: ESTADO_COLOR[estado] }}
              onClick={() => setFiltroEstado(estado)}
            >
              <p className={styles.kpiNum} style={{ color: ESTADO_COLOR[estado] }}>
                {loading ? '…' : conteo(estado)}
              </p>
              <p className={styles.kpiLabel}>{ESTADO_LABEL[estado]}</p>
            </div>
          ))}
          <div className={styles.kpiCard} style={{ borderTopColor: '#78716c' }}>
            <p className={styles.kpiNum}>{loading ? '…' : pedidos.length}</p>
            <p className={styles.kpiLabel}>Total</p>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          <button
            className={`${styles.chip} ${filtroEstado === 'todos' ? styles.chipActive : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >Todos</button>
          {ESTADOS_DOMICILIO.map((e) => (
            <button
              key={e}
              className={`${styles.chip} ${filtroEstado === e ? styles.chipActive : ''}`}
              style={filtroEstado === e ? { background: ESTADO_COLOR[e], borderColor: ESTADO_COLOR[e] } : {}}
              onClick={() => setFiltroEstado(e)}
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
          <button
            className={styles.chip}
            style={{ marginLeft: 'auto', background: '#f5f5f4', borderColor: '#e7e5e4' }}
            onClick={cargar}
          >↻ Actualizar</button>
        </div>

        {/* Cards de entregas */}
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#78716c' }}>Cargando domicilios…</p>
        ) : (
          <div className={styles.grid}>
            {entregasFiltradas.map((pedido) => {
              const enAccion = accionando === pedido.id;
              const estado   = pedido.estado as EstadoEntrega;
              return (
                <div key={pedido.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardId}>
                      <span className={styles.pedidoId}>#{pedido.id}</span>
                      <span className={styles.hora}>{formatHora(pedido.fechaHora)}</span>
                    </div>
                    <span
                      className={styles.estadoBadge}
                      style={{ background: `${ESTADO_COLOR[estado] ?? '#78716c'}15`, color: ESTADO_COLOR[estado] ?? '#78716c' }}
                    >
                      {ESTADO_LABEL[estado] ?? estado}
                    </span>
                  </div>

                  <div className={styles.clienteInfo}>
                    {pedido.cliente && (
                      <p className={styles.clienteNombre}>👤 {pedido.cliente.nombre}</p>
                    )}
                    {pedido.direccionEntrega && (
                      <p className={styles.clienteDir}>📍 {pedido.direccionEntrega}</p>
                    )}
                  </div>

                  <ul className={styles.items}>
                    {(pedido.detalles ?? []).map((d) => (
                      <li key={d.id}>{d.plato.nombre} ×{d.cantidad}</li>
                    ))}
                  </ul>

                  <div className={styles.cardFooter}>
                    <span className={styles.total}>{formatPrecio(pedido.total)}</span>

                    <div className={styles.asignacion}>
                      {estado === 'entregado' ? (
                        <span className={styles.entregadoPor}>✓ Entregado</span>
                      ) : estado === 'cancelado' ? (
                        <span style={{ color: '#b91c1c', fontSize: '0.8125rem' }}>Cancelado</span>
                      ) : estado === 'en_camino' ? (
                        <button
                          className={styles.selectDomiciliario}
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => marcarEntregado(pedido)}
                          disabled={enAccion}
                        >
                          {enAccion ? '…' : '✓ Marcar entregado'}
                        </button>
                      ) : (
                        /* pendiente o listo — asignar domiciliario y despachar */
                        <select
                          className={styles.selectDomiciliario}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) despacharPedido(pedido, Number(e.target.value));
                          }}
                          disabled={enAccion || domiciliarios.length === 0}
                        >
                          <option value="">Despachar con…</option>
                          {domiciliarios.map((d) => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && entregasFiltradas.length === 0 && (
          <div className={styles.empty}>
            <span>🛵</span>
            <p>No hay domicilios con este filtro.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
