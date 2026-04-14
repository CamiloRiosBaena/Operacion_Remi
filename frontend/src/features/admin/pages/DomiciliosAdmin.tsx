import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import styles from './DomiciliosAdmin.module.css';

type EstadoEntrega = 'asignado' | 'en_camino' | 'entregado' | 'cancelado';

const ESTADO_LABEL: Record<EstadoEntrega, string> = {
  asignado: 'Asignado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ESTADO_COLOR: Record<EstadoEntrega, string> = {
  asignado: '#3b82f6',
  en_camino: '#d97706',
  entregado: '#16a34a',
  cancelado: '#b91c1c',
};

const DOMICILIARIOS = [
  { id: 'd1', nombre: 'Repartidor Juan' },
  { id: 'd2', nombre: 'Ana Gómez' },
  { id: 'd3', nombre: 'Luis Mora' },
];

const ENTREGAS_MOCK = [
  { id: 'P-010', cliente: 'María López', telefono: '310 000 0001', direccion: 'Calle 45 # 12-30, Apto 201', items: ['Pollo asado x1', 'Arroz x1'], total: 33000, estado: 'en_camino' as EstadoEntrega, domiciliarioId: 'd1', hora: '13:10' },
  { id: 'P-011', cliente: 'Carlos Ruiz', telefono: '310 000 0002', direccion: 'Carrera 8 # 22-15', items: ['Hamburguesa x2', 'Papas x2'], total: 56000, estado: 'asignado' as EstadoEntrega, domiciliarioId: 'd2', hora: '13:25' },
  { id: 'P-012', cliente: 'Sofía Díaz', telefono: '310 000 0003', direccion: 'Av. 30 # 50-10', items: ['Bandeja x1', 'Jugo x1'], total: 33000, estado: 'entregado' as EstadoEntrega, domiciliarioId: 'd1', hora: '12:40' },
  { id: 'P-013', cliente: 'Pedro Soto', telefono: '310 000 0004', direccion: 'Cll 12 # 3-45', items: ['Ajiaco x2'], total: 44000, estado: 'asignado' as EstadoEntrega, domiciliarioId: null, hora: '13:40' },
];

type Entrega = typeof ENTREGAS_MOCK[0] & { domiciliarioId: string | null };

export function DomiciliosAdmin() {
  const [entregas, setEntregas] = useState<Entrega[]>(ENTREGAS_MOCK);
  const [filtroEstado, setFiltroEstado] = useState<EstadoEntrega | 'todos'>('todos');

  const entregasFiltradas =
    filtroEstado === 'todos' ? entregas : entregas.filter((e) => e.estado === filtroEstado);

  function asignarDomiciliario(pedidoId: string, domiciliarioId: string) {
    setEntregas((prev) =>
      prev.map((e) => (e.id === pedidoId ? { ...e, domiciliarioId, estado: 'asignado' as EstadoEntrega } : e)),
    );
  }

  const conteo = (estado: EstadoEntrega) => entregas.filter((e) => e.estado === estado).length;

  return (
    <AdminLayout title="Gestión de Domicilios">
      <div className={styles.wrapper}>
        {/* KPIs */}
        <div className={styles.kpiRow}>
          {(['asignado', 'en_camino', 'entregado'] as EstadoEntrega[]).map((estado) => (
            <div
              key={estado}
              className={styles.kpiCard}
              style={{ borderTopColor: ESTADO_COLOR[estado] }}
              onClick={() => setFiltroEstado(estado)}
            >
              <p className={styles.kpiNum} style={{ color: ESTADO_COLOR[estado] }}>{conteo(estado)}</p>
              <p className={styles.kpiLabel}>{ESTADO_LABEL[estado]}</p>
            </div>
          ))}
          <div className={styles.kpiCard} style={{ borderTopColor: '#78716c' }}>
            <p className={styles.kpiNum}>{entregas.length}</p>
            <p className={styles.kpiLabel}>Total hoy</p>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          {(['todos', 'asignado', 'en_camino', 'entregado', 'cancelado'] as const).map((e) => (
            <button
              key={e}
              className={`${styles.chip} ${filtroEstado === e ? styles.chipActive : ''}`}
              style={filtroEstado === e && e !== 'todos' ? { background: ESTADO_COLOR[e], borderColor: ESTADO_COLOR[e] } : {}}
              onClick={() => setFiltroEstado(e)}
            >
              {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
            </button>
          ))}
        </div>

        {/* Cards de entregas */}
        <div className={styles.grid}>
          {entregasFiltradas.map((entrega) => {
            const domiciliario = DOMICILIARIOS.find((d) => d.id === entrega.domiciliarioId);
            return (
              <div key={entrega.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardId}>
                    <span className={styles.pedidoId}>{entrega.id}</span>
                    <span className={styles.hora}>{entrega.hora}</span>
                  </div>
                  <span
                    className={styles.estadoBadge}
                    style={{ background: `${ESTADO_COLOR[entrega.estado]}15`, color: ESTADO_COLOR[entrega.estado] }}
                  >
                    {ESTADO_LABEL[entrega.estado]}
                  </span>
                </div>

                <div className={styles.clienteInfo}>
                  <p className={styles.clienteNombre}>👤 {entrega.cliente}</p>
                  <p className={styles.clienteTel}>📱 {entrega.telefono}</p>
                  <p className={styles.clienteDir}>📍 {entrega.direccion}</p>
                </div>

                <ul className={styles.items}>
                  {entrega.items.map((item) => <li key={item}>{item}</li>)}
                </ul>

                <div className={styles.cardFooter}>
                  <span className={styles.total}>${entrega.total.toLocaleString('es-CO')}</span>

                  <div className={styles.asignacion}>
                    {entrega.estado === 'entregado' ? (
                      <span className={styles.entregadoPor}>✓ {domiciliario?.nombre ?? '—'}</span>
                    ) : (
                      <select
                        className={styles.selectDomiciliario}
                        value={entrega.domiciliarioId ?? ''}
                        onChange={(e) => asignarDomiciliario(entrega.id, e.target.value)}
                        disabled={entrega.estado === 'cancelado'}
                      >
                        <option value="">Sin asignar</option>
                        {DOMICILIARIOS.map((d) => (
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

        {entregasFiltradas.length === 0 && (
          <div className={styles.empty}>
            <span>🛵</span>
            <p>No hay entregas con este filtro.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
