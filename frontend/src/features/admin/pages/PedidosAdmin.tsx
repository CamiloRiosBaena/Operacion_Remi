import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useRealtimePedidos } from '@/shared/hooks/useRealtimePedidos';
import {
  fetchPedidos, cambiarEstadoPedido, cancelarPedido,
  type ApiPedido, type EstadoPedidoApi, type TipoPedidoApi,
} from '../services/admin.service';
import styles from './PedidosAdmin.module.css';

/* ── Helpers ── */
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function getMonthRange(offset: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { first, afterLast: new Date(first.getFullYear(), first.getMonth() + 1, 1) };
}
function getMonthLabel(offset: number) {
  const now = new Date(); const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

const ESTADO_LABEL: Record<EstadoPedidoApi, string> = {
  pendiente:'Recibido', en_cocina:'En preparación', listo:'Listo',
  en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado',
};
const ESTADO_COLOR: Record<EstadoPedidoApi, string> = {
  pendiente:'#3b82f6', en_cocina:'#d97706', listo:'#16a34a',
  en_camino:'#0369a1', entregado:'#78716c', cancelado:'#b91c1c',
};
const SIGUIENTE_ESTADO: Partial<Record<EstadoPedidoApi, EstadoPedidoApi>> = {
  pendiente:'en_cocina', en_cocina:'listo', listo:'entregado', en_camino:'entregado',
};

// Todos los estados para el filtro de chips
const ESTADOS_FILTRO: (EstadoPedidoApi | 'todos')[] = [
  'todos', 'pendiente', 'en_cocina', 'listo', 'en_camino', 'entregado', 'cancelado',
];

const CHIP_CLASS: Record<EstadoPedidoApi, string> = {
  pendiente: 'adm-chip adm-chip-info', en_cocina: 'adm-chip adm-chip-warn',
  listo: 'adm-chip adm-chip-ok', en_camino: 'adm-chip adm-chip-info',
  entregado: 'adm-chip adm-chip-ok', cancelado: 'adm-chip adm-chip-bad',
};
const TIPO_CHIP: Record<string, string> = {
  mesa: 'adm-chip adm-chip-warn', domicilio: 'adm-chip adm-chip-info', llevar: 'adm-chip adm-chip-neutral',
};
const TIPO_LABEL: Record<string, string> = { mesa: 'Mesa', domicilio: 'Domicilio', llevar: 'Llevar' };

function tiempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}
function formatPrecio(n: number) { return `$${Number(n).toLocaleString('es-CO')}`; }
function labelCliente(p: ApiPedido) {
  if (p.tipo === 'mesa' && p.mesa) return `Mesa ${p.mesa.numero}`;
  if (p.cliente) return p.cliente.nombre; return 'Invitado';
}

// Tile color por tipo (como el diseño)
const TIPO_TILE: Record<string, string> = { mesa:'amber', domicilio:'sky', llevar:'peach' };
// Icono SVG por tipo
const TIPO_ICON: Record<string, string> = {
  mesa:      '<path d="M4 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M5 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>',
  domicilio: '<circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/>',
  llevar:    '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
};

export function PedidosAdmin() {
  const [pedidos,      setPedidos     ] = useState<ApiPedido[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedidoApi | 'todos'>('todos');
  const [filtroTipo,   setFiltroTipo  ] = useState<TipoPedidoApi | 'todos'>('todos');
  const [monthOffset,  setMonthOffset ] = useState(0);
  const [accionando,       setAccionando      ] = useState<number | null>(null);
  const [detalle,          setDetalle         ] = useState<ApiPedido | null>(null);
  const [showEstadoFilter, setShowEstadoFilter] = useState(false);
  const [busqueda,         setBusqueda        ] = useState('');

  const cargar = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetchPedidos().then(setPedidos).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useRealtimePedidos(() => cargar(true));

  const { first: mesFirst, afterLast: mesAfterLast } = getMonthRange(monthOffset);
  const pedidosDelMes = pedidos.filter(p => {
    const f = new Date(p.fechaHora); return f >= mesFirst && f < mesAfterLast;
  });
  const q = busqueda.trim().toLowerCase();
  const pedidosFiltrados = pedidosDelMes.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (filtroTipo   !== 'todos' && p.tipo   !== filtroTipo)   return false;
    if (!q) return true;
    return (
      String(p.id).includes(q) ||
      (p.cliente?.nombre ?? '').toLowerCase().includes(q) ||
      (p.mesa?.numero !== undefined && String(p.mesa.numero).includes(q))
    );
  });

  // KPI counts
  const pedidosHoy = pedidosDelMes.filter(p => p.estado !== 'cancelado').length;
  const enLocal    = pedidosDelMes.filter(p => p.tipo === 'mesa').length;
  const domicilios = pedidosDelMes.filter(p => p.tipo === 'domicilio').length;
  const totalMes   = pedidosDelMes.filter(p => p.estado !== 'cancelado').reduce((s,p) => s + Number(p.total), 0);
  const ticket     = pedidosHoy > 0 ? Math.round(totalMes / pedidosHoy) : 0;
  const totalVisible = pedidosFiltrados.filter(p => p.estado !== 'cancelado').reduce((s,p) => s + Number(p.total), 0);

  async function avanzarEstado(p: ApiPedido) {
    const siguiente = SIGUIENTE_ESTADO[p.estado]; if (!siguiente) return;
    setAccionando(p.id);
    try { const act = await cambiarEstadoPedido(p.id, siguiente); setPedidos(prev => prev.map(x => x.id === p.id ? act : x)); }
    catch (err) { console.error(err); } finally { setAccionando(null); }
  }
  async function handleCancelar(p: ApiPedido) {
    if (!confirm(`¿Cancelar pedido #${p.id}?`)) return; setAccionando(p.id);
    try { const act = await cancelarPedido(p.id); setPedidos(prev => prev.map(x => x.id === p.id ? act : x)); }
    catch (err) { console.error(err); } finally { setAccionando(null); }
  }

  return (
    <AdminLayout title="Pedidos" subtitle="Todos los pedidos en curso">
      <div className="adm-view">

        {/* ── KPIs — diseño: Pedidos hoy / En local / Domicilios / Ticket promedio ── */}
        <div className={styles.kpiGrid}>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Pedidos hoy</div>
              <div className="adm-tile peach" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v4h4M9 11h6M9 15h6"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : pedidosHoy}</div>
            <div className="adm-kpi-foot">
              <span className="muted">{pedidosDelMes.filter(p=>p.estado==='en_cocina').length} en preparación</span>
            </div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">En local</div>
              <div className="adm-tile amber" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M5 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : enLocal}</div>
            <div className="adm-kpi-foot">
              <span className="muted">{pedidosDelMes.filter(p=>p.tipo==='mesa'&&p.estado!=='entregado'&&p.estado!=='cancelado').length} mesas activas</span>
            </div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Domicilios</div>
              <div className="adm-tile sky" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : domicilios}</div>
            <div className="adm-kpi-foot">
              <span className="muted">{pedidosDelMes.filter(p=>p.tipo==='domicilio'&&p.estado==='en_camino').length} en camino</span>
            </div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Ticket promedio</div>
              <div className="adm-tile sage" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v6M18 9v6"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : formatPrecio(ticket)}</div>
            <div className="adm-kpi-foot">
              <span className="muted">Total: {formatPrecio(totalVisible)}</span>
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className={styles.toolbarMain}>
          <div className="adm-search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input placeholder="Buscar #pedido o cliente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>

          {/* Tipo — seg principal */}
          <div className="adm-seg">
            <button className={filtroTipo === 'todos'     ? 'active' : ''} onClick={() => setFiltroTipo('todos')}>Todos</button>
            <button className={filtroTipo === 'mesa'      ? 'active' : ''} onClick={() => setFiltroTipo('mesa')}>En local</button>
            <button className={filtroTipo === 'domicilio' ? 'active' : ''} onClick={() => setFiltroTipo('domicilio')}>Domicilio</button>
            <button className={filtroTipo === 'llevar'    ? 'active' : ''} onClick={() => setFiltroTipo('llevar')}>Llevar</button>
          </div>

          {/* Estado — botón Filtros con dropdown (igual a Menú) */}
          <div className={styles.filtrosWrap}>
            <button
              className={`adm-btn adm-btn-ghost ${showEstadoFilter ? styles.filtrosBtnActive : ''}`}
              onClick={() => setShowEstadoFilter(v => !v)}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></svg>
              Filtros
              {filtroEstado !== 'todos' && <span className={styles.filtrosDot} />}
            </button>
            {showEstadoFilter && (
              <div className={styles.filtrosDropdown}>
                <div className={styles.filtrosTitle}>Filtrar por estado</div>
                <div className={styles.filtrosChips}>
                  {ESTADOS_FILTRO.map(e => (
                    <button
                      key={e}
                      className={`${styles.filtrosChip} ${filtroEstado === e ? styles.filtrosChipActive : ''}`}
                      style={filtroEstado === e && e !== 'todos' ? { background: ESTADO_COLOR[e], color: '#fff', borderColor: 'transparent' } : undefined}
                      onClick={() => { setFiltroEstado(e); setShowEstadoFilter(false); }}
                    >
                      {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="adm-toolbar-spacer" />

          <div className="adm-month-nav">
            <button className="adm-month-btn"
              onClick={() => setMonthOffset(o => Math.max(o - 1, -24))}
              disabled={monthOffset <= -24}>‹</button>
            <span>{getMonthLabel(monthOffset)}</span>
            <button className="adm-month-btn"
              onClick={() => setMonthOffset(o => o + 1)}
              disabled={monthOffset >= 0}>›</button>
          </div>

          <button className={styles.btnRefresh} onClick={() => cargar()}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: -2 }}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Actualizar
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className={`adm-table-wrap ${styles.tableWrap}`}>
          {loading ? (
            <div className="adm-loading">Cargando pedidos…</div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="adm-empty">No hay pedidos con ese filtro</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Detalle</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Tiempo</th>
                  <th style={{ width: 190 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map(p => {
                  const sig   = SIGUIENTE_ESTADO[p.estado];
                  const enAcc = accionando === p.id;
                  const tile  = TIPO_TILE[p.tipo] ?? 'peach';
                  const icon  = TIPO_ICON[p.tipo] ?? TIPO_ICON.llevar;
                  return (
                    <tr key={p.id} style={p.estado === 'cancelado' ? { opacity: 0.55 } : undefined}>
                      <td><span className="adm-cell-strong">#{p.id}</span></td>

                      {/* Cliente + Tipo merged — igual al diseño */}
                      <td>
                        <div className="adm-cell-flex">
                          <div className={`adm-tile ${tile}`} style={{ width:38, height:38, borderRadius:10 }}>
                            <svg viewBox="0 0 24 24" width={19} height={19} fill="none"
                              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                              dangerouslySetInnerHTML={{ __html: icon }} />
                          </div>
                          <div>
                            <div className="adm-cell-strong">{labelCliente(p)}</div>
                            <div className="adm-cell-sub">{TIPO_LABEL[p.tipo] ?? p.tipo}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <button
                          className="adm-btn adm-btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 12.5 }}
                          onClick={() => setDetalle(p)}
                        >
                          {p.detalles?.length ?? 0} plato(s)
                        </button>
                      </td>
                      <td className="adm-cell-strong">{formatPrecio(p.total)}</td>
                      <td>
                        <span className={CHIP_CLASS[p.estado] ?? 'adm-chip adm-chip-neutral'}>
                          <span className="adm-chip-dot" />{ESTADO_LABEL[p.estado]}
                        </span>
                      </td>

                      {/* Tiempo relativo */}
                      <td>
                        <span className="adm-cell-sub" style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
                          {tiempoRelativo(p.fechaHora)}
                        </span>
                      </td>

                      <td>
                        <div className="adm-row-act">
                          {sig && (
                            <button
                              className="adm-mini-btn"
                              title={`Avanzar → ${ESTADO_LABEL[sig]}`}
                              onClick={() => avanzarEstado(p)}
                              disabled={enAcc}
                              style={enAcc ? { opacity: 0.5 } : undefined}
                            >
                              {enAcc
                                ? <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>
                                : <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12.5 10 17.5 19.5 7"/></svg>
                              }
                            </button>
                          )}
                          {p.estado !== 'cancelado' && p.estado !== 'entregado' && (
                            <button className={styles.btnCancelar} onClick={() => handleCancelar(p)} disabled={enAcc}>✕</button>
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
        <p className="adm-count">{pedidosFiltrados.length} pedido(s)</p>
      </div>

      {/* ── Modal detalle ── */}
      {detalle && (
        <div className="adm-overlay" onClick={() => setDetalle(null)}>
          <div className="adm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Pedido #{detalle.id} — {labelCliente(detalle)}</div>
            <ul className={styles.detalleList}>
              {detalle.detalles?.map(d => (
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
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
