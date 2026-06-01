import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useRealtimePedidos } from '@/shared/hooks/useRealtimePedidos';
import {
  fetchPedidos, fetchStaff, cambiarEstadoPedido,
  type ApiPedido, type ApiStaff,
} from '../services/admin.service';
import styles from './DomiciliosAdmin.module.css';

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

type EstadoEntrega = 'pendiente' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
const ESTADO_LABEL: Record<EstadoEntrega, string> = {
  pendiente:'Pendiente', listo:'Listo para despachar', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado',
};
const CHIP_CLASS: Record<EstadoEntrega, string> = {
  pendiente: 'adm-chip adm-chip-info', listo: 'adm-chip adm-chip-ok',
  en_camino: 'adm-chip adm-chip-warn', entregado: 'adm-chip adm-chip-neutral', cancelado: 'adm-chip adm-chip-bad',
};

function formatHora(iso: string) { return new Date(iso).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); }
function formatPrecio(n: number) { return `$${Number(n).toLocaleString('es-CO')}`; }

const ESTADOS_DOM: EstadoEntrega[] = ['pendiente','listo','en_camino','entregado','cancelado'];

export function DomiciliosAdmin() {
  const [pedidos,       setPedidos      ] = useState<ApiPedido[]>([]);
  const [domiciliarios, setDomiciliarios] = useState<ApiStaff[]>([]);
  const [loading,       setLoading      ] = useState(true);
  const [accionando,    setAccionando   ] = useState<number | null>(null);
  const [filtroEstado,   setFiltroEstado  ] = useState<EstadoEntrega | 'todos'>('todos');
  const [monthOffset,    setMonthOffset   ] = useState(0);
  const [showFiltros,    setShowFiltros   ] = useState(false);
  const [busqueda,       setBusqueda      ] = useState('');

  const cargar = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [todos, staff] = await Promise.all([fetchPedidos(), fetchStaff()]);
      setPedidos(todos.filter(p => p.tipo === 'domicilio'));
      setDomiciliarios(staff.filter(s => s.rol === 'domiciliario' && s.estado === 'activo'));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useRealtimePedidos(() => cargar(true));

  const { first: mesFirst, afterLast: mesAfterLast } = getMonthRange(monthOffset);
  const delMes = pedidos.filter(p => { const f = new Date(p.fechaHora); return f >= mesFirst && f < mesAfterLast; });
  const q = busqueda.trim().toLowerCase();
  const filtradas = delMes.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (!q) return true;
    return (
      String(p.id).includes(q) ||
      (p.cliente?.nombre ?? '').toLowerCase().includes(q)
    );
  });
  const conteo = (e: EstadoEntrega) => delMes.filter(p => p.estado === e).length;

  async function despacharPedido(pedido: ApiPedido, domId: number) {
    setAccionando(pedido.id);
    try { const act = await cambiarEstadoPedido(pedido.id, 'en_camino', domId); setPedidos(prev => prev.map(p => p.id === pedido.id ? act : p)); }
    catch (err) { console.error(err); } finally { setAccionando(null); }
  }
  async function marcarEntregado(pedido: ApiPedido) {
    setAccionando(pedido.id);
    try { const act = await cambiarEstadoPedido(pedido.id, 'entregado'); setPedidos(prev => prev.map(p => p.id === pedido.id ? act : p)); }
    catch (err) { console.error(err); } finally { setAccionando(null); }
  }

  return (
    <AdminLayout title="Gestión de Domicilios">
      <div className="adm-view">

        {/* ── KPIs — igual al diseño: En curso / Pendientes / Entregados hoy ── */}
        <div className="adm-cols-3" style={{ marginBottom: 22 }}>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">En curso</div>
              <div className="adm-tile sky" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : conteo('en_camino')}</div>
            <div className="adm-kpi-foot"><span className="muted">Repartidores activos</span></div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Pendientes</div>
              <div className="adm-tile peach" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : conteo('pendiente')}</div>
            <div className="adm-kpi-foot"><span className="muted">Sin asignar</span></div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Entregados hoy</div>
              <div className="adm-tile sage" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5 11 15.5 16 9.5"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : conteo('entregado')}</div>
            <div className="adm-kpi-foot"><span className="muted">Tiempo prom. 28 min</span></div>
          </div>
        </div>

        {/* ── Toolbar con "Filtros" dropdown — todos los estados ── */}
        <div className="adm-toolbar">
          <div className="adm-search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input placeholder="Buscar entrega…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>

          {/* Filtros dropdown con todos los estados */}
          <div style={{ position: 'relative' }}>
            <button
              className={`adm-btn adm-btn-ghost`}
              style={filtroEstado !== 'todos' ? { borderColor: 'var(--adm-accent)', color: 'var(--adm-accent-deep)', background: 'var(--adm-accent-soft)' } : undefined}
              onClick={() => setShowFiltros(v => !v)}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></svg>
              Filtros
              {filtroEstado !== 'todos' && (
                <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--adm-accent)', display:'inline-block', marginLeft:2 }} />
              )}
            </button>
            {showFiltros && (
              <div style={{
                position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:50,
                background:'var(--adm-card)', border:'1px solid var(--adm-line)',
                borderRadius:'var(--adm-r-lg)', boxShadow:'var(--adm-shadow-lg)',
                padding:'14px 16px', width:280,
              }}>
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--adm-muted)', marginBottom:10, fontFamily:'var(--adm-font-ui)' }}>Filtrar por estado</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {(['todos','pendiente','listo','en_camino','entregado','cancelado'] as (EstadoEntrega|'todos')[]).map(e => (
                    <button key={e}
                      style={{
                        padding:'5px 12px', borderRadius:99, fontSize:13, fontWeight:600,
                        border:'1.5px solid', fontFamily:'var(--adm-font-ui)', cursor:'pointer',
                        transition:'all .15s',
                        background: filtroEstado === e ? 'var(--adm-accent)' : 'var(--adm-bg-2)',
                        color: filtroEstado === e ? '#fff' : 'var(--adm-ink-soft)',
                        borderColor: filtroEstado === e ? 'var(--adm-accent)' : 'var(--adm-line)',
                      }}
                      onClick={() => { setFiltroEstado(e); setShowFiltros(false); }}
                    >
                      {e === 'todos' ? 'Todas' : ESTADO_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="adm-toolbar-spacer" />
          <div className="adm-month-nav">
            <button className="adm-month-btn" onClick={() => setMonthOffset(o => Math.max(o-1,-24))} disabled={monthOffset<=-24}>‹</button>
            <span>{getMonthLabel(monthOffset)}</span>
            <button className="adm-month-btn" onClick={() => setMonthOffset(o => o+1)} disabled={monthOffset>=0}>›</button>
          </div>
          <button className="adm-btn adm-btn-ghost" onClick={() => cargar()}>↻ Actualizar</button>
        </div>

        {/* ── Cards ── */}
        {loading ? <div className="adm-loading">Cargando domicilios…</div>
        : filtradas.length === 0 ? (
          <div className="adm-empty">No hay domicilios con este filtro.</div>
        ) : (
          <div className={styles.grid}>
            {filtradas.map(pedido => {
              const enAcc = accionando === pedido.id;
              const estado = pedido.estado as EstadoEntrega;
              return (
                <div key={pedido.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardId}>#{pedido.id}</div>
                      <div className={styles.hora}>{formatHora(pedido.fechaHora)}</div>
                    </div>
                    <span className={CHIP_CLASS[estado] ?? 'adm-chip adm-chip-neutral'}>
                      <span className="adm-chip-dot" />{ESTADO_LABEL[estado] ?? estado}
                    </span>
                  </div>
                  {pedido.cliente && <div className={styles.clienteNombre}>👤 {pedido.cliente.nombre}</div>}
                  {pedido.direccionEntrega && <div className={styles.clienteDir}>📍 {pedido.direccionEntrega}</div>}
                  <ul className={styles.items}>
                    {(pedido.detalles ?? []).map(d => (
                      <li key={d.id}>{d.plato.nombre} ×{d.cantidad}</li>
                    ))}
                  </ul>
                  <div className={styles.cardFooter}>
                    <span className={styles.total}>{formatPrecio(pedido.total)}</span>
                    <div>
                      {estado === 'entregado' ? (
                        <span className="adm-chip adm-chip-ok"><span className="adm-chip-dot" />Entregado</span>
                      ) : estado === 'cancelado' ? (
                        <span className="adm-chip adm-chip-bad"><span className="adm-chip-dot" />Cancelado</span>
                      ) : estado === 'en_camino' ? (
                        <button className={styles.btnMarcar} onClick={() => marcarEntregado(pedido)} disabled={enAcc}>
                          {enAcc ? '…' : '✓ Marcar entregado'}
                        </button>
                      ) : (
                        <select className={styles.selectDomiciliario} defaultValue=""
                          onChange={e => { if (e.target.value) despacharPedido(pedido, Number(e.target.value)); }}
                          disabled={enAcc || domiciliarios.length === 0}>
                          <option value="">Despachar con…</option>
                          {domiciliarios.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
