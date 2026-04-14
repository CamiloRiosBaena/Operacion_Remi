import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import styles from './PedidosAdmin.module.css';

type EstadoPedido = 'recibido' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
type TipoPedido = 'mesa' | 'domicilio';

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  recibido: 'Recibido',
  preparando: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_COLOR: Record<EstadoPedido, string> = {
  recibido: '#3b82f6',
  preparando: '#d97706',
  listo: '#16a34a',
  entregado: '#78716c',
  cancelado: '#b91c1c',
};

const PEDIDOS_MOCK = [
  { id: 'P-001', cliente: 'Mesa 3', tipo: 'mesa' as TipoPedido, estado: 'preparando' as EstadoPedido, total: 33000, items: 2, hora: '13:15', fecha: 'Hoy' },
  { id: 'P-002', cliente: 'Mesa 7', tipo: 'mesa' as TipoPedido, estado: 'recibido' as EstadoPedido, total: 44000, items: 3, hora: '13:22', fecha: 'Hoy' },
  { id: 'P-003', cliente: 'María López', tipo: 'domicilio' as TipoPedido, estado: 'listo' as EstadoPedido, total: 56000, items: 4, hora: '12:50', fecha: 'Hoy' },
  { id: 'P-004', cliente: 'Carlos Ruiz', tipo: 'domicilio' as TipoPedido, estado: 'entregado' as EstadoPedido, total: 28000, items: 1, hora: '12:10', fecha: 'Hoy' },
  { id: 'P-005', cliente: 'Mesa 1', tipo: 'mesa' as TipoPedido, estado: 'listo' as EstadoPedido, total: 22000, items: 2, hora: '12:45', fecha: 'Hoy' },
  { id: 'P-006', cliente: 'Andrés Torres', tipo: 'domicilio' as TipoPedido, estado: 'cancelado' as EstadoPedido, total: 15000, items: 1, hora: '11:30', fecha: 'Hoy' },
];

const ESTADOS_FILTRO: (EstadoPedido | 'todos')[] = ['todos', 'recibido', 'preparando', 'listo', 'entregado', 'cancelado'];

export function PedidosAdmin() {
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | 'todos'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<TipoPedido | 'todos'>('todos');

  const pedidosFiltrados = PEDIDOS_MOCK.filter((p) => {
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
    return matchEstado && matchTipo;
  });

  const totalVentas = pedidosFiltrados
    .filter((p) => p.estado !== 'cancelado')
    .reduce((s, p) => s + p.total, 0);

  return (
    <AdminLayout title="Pedidos">
      <div className={styles.wrapper}>
        {/* Resumen rápido */}
        <div className={styles.summary}>
          {(['recibido', 'preparando', 'listo'] as EstadoPedido[]).map((estado) => {
            const count = PEDIDOS_MOCK.filter((p) => p.estado === estado).length;
            return (
              <div
                key={estado}
                className={styles.summaryCard}
                style={{ borderTopColor: ESTADO_COLOR[estado] }}
                onClick={() => setFiltroEstado(estado)}
              >
                <p className={styles.summaryCount} style={{ color: ESTADO_COLOR[estado] }}>{count}</p>
                <p className={styles.summaryLabel}>{ESTADO_LABEL[estado]}</p>
              </div>
            );
          })}
          <div className={styles.summaryCard} style={{ borderTopColor: '#1c1917' }}>
            <p className={styles.summaryCount}>${totalVentas.toLocaleString('es-CO')}</p>
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
            {(['todos', 'mesa', 'domicilio'] as const).map((t) => (
              <button
                key={t}
                className={`${styles.filtroChip} ${filtroTipo === t ? styles.filtroActive : ''}`}
                onClick={() => setFiltroTipo(t)}
              >
                {t === 'todos' ? 'Todos' : t === 'mesa' ? '🪑 Mesa' : '🛵 Domicilio'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente / Mesa</th>
                <th>Tipo</th>
                <th>Items</th>
                <th>Total</th>
                <th>Hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.map((p) => (
                <tr key={p.id} className={p.estado === 'cancelado' ? styles.rowCancelada : ''}>
                  <td><span className={styles.pedidoId}>{p.id}</span></td>
                  <td className={styles.cliente}>{p.cliente}</td>
                  <td>
                    <span className={`${styles.tipoBadge} ${p.tipo === 'mesa' ? styles.tipoMesa : styles.tipoDomicilio}`}>
                      {p.tipo === 'mesa' ? '🪑 Mesa' : '🛵 Domicilio'}
                    </span>
                  </td>
                  <td className={styles.items}>{p.items} plato{p.items !== 1 ? 's' : ''}</td>
                  <td className={styles.total}>${p.total.toLocaleString('es-CO')}</td>
                  <td className={styles.hora}>{p.hora}</td>
                  <td>
                    <span
                      className={styles.estadoBadge}
                      style={{ background: `${ESTADO_COLOR[p.estado]}15`, color: ESTADO_COLOR[p.estado] }}
                    >
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={styles.count}>{pedidosFiltrados.length} pedidos</p>
      </div>
    </AdminLayout>
  );
}
