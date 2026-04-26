import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/shared/components/AppShell';
import {
  fetchPedidosCocina, marcarEnCocina, marcarListo,
  fetchPedidosDespacho, fetchDomiciliarios, despacharRuta,
} from '../services/cocina.service';
import type { ApiPedido, ApiStaff } from '@/features/admin/services/admin.service';
import styles from './CocinaDashboard.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Recibido',
  en_cocina: 'En preparación',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente: '#3b82f6',
  en_cocina: '#d97706',
};

const TIPO_LABEL: Record<string, string> = {
  mesa: 'Mesa', llevar: 'Para llevar', domicilio: 'Domicilio',
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function minutosDesde(iso: string) {
  const fecha = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? new Date(iso) : new Date(iso + 'Z');
  return Math.floor((Date.now() - fecha.getTime()) / 60000);
}

function ubicacion(p: ApiPedido) {
  if (p.tipo === 'mesa' && p.mesa) return `Mesa ${p.mesa.numero}`;
  return TIPO_LABEL[p.tipo] ?? p.tipo;
}

function horaListo(p: ApiPedido): string {
  const entrada = p.historial
    ?.filter((h) => h.estado === 'listo')
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())[0];
  return entrada?.fechaHora ?? p.fechaHora;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function CocinaDashboard() {
  const [pedidos,       setPedidos      ] = useState<ApiPedido[]>([]);
  const [despacho,      setDespacho     ] = useState<ApiPedido[]>([]);
  const [domiciliarios, setDomiciliarios] = useState<ApiStaff[]>([]);
  const [loading,       setLoading      ] = useState(true);
  const [connected,     setConnected    ] = useState(false);
  const [actualizando,  setActualizando ] = useState<number | null>(null);

  // Despacho: selección y domiciliario elegido
  const [seleccionados,    setSeleccionados   ] = useState<Set<number>>(new Set());
  const [domiciliarioId,   setDomiciliarioId  ] = useState<number | ''>('');
  const [despachando,      setDespachando     ] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [kds, cola, staff] = await Promise.all([
        fetchPedidosCocina(),
        fetchPedidosDespacho(),
        fetchDomiciliarios(),
      ]);
      setPedidos(kds);
      setDespacho(cola);
      setDomiciliarios(staff);
      setConnected(true);
      // Limpiar selección de pedidos que ya no están en la cola
      setSeleccionados((prev) => {
        const ids = new Set(cola.map((p) => p.id));
        return new Set([...prev].filter((id) => ids.has(id)));
      });
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

  // ── Acciones KDS ───────────────────────────────────────────────────────────

  async function handleAccion(pedido: ApiPedido) {
    setActualizando(pedido.id);
    try {
      const actualizado = pedido.estado === 'pendiente'
        ? await marcarEnCocina(pedido.id)
        : await marcarListo(pedido.id);

      if (actualizado.estado === 'listo') {
        setPedidos((prev) => prev.filter((p) => p.id !== actualizado.id));
        if (actualizado.tipo === 'domicilio') {
          setDespacho((prev) => [...prev, actualizado]);
        }
      } else {
        setPedidos((prev) => prev.map((p) => p.id === actualizado.id ? actualizado : p));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActualizando(null);
    }
  }

  // ── Acciones despacho ──────────────────────────────────────────────────────

  function toggleSeleccion(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDespachar() {
    if (!domiciliarioId || seleccionados.size === 0) return;
    setDespachando(true);
    try {
      await despacharRuta([...seleccionados], Number(domiciliarioId));
      setDespacho((prev) => prev.filter((p) => !seleccionados.has(p.id)));
      setSeleccionados(new Set());
      setDomiciliarioId('');
    } catch (err) {
      console.error(err);
    } finally {
      setDespachando(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell title="KDS — Cocina">
      <div className={styles.wrapper}>

        {/* Status bar */}
        <div className={styles.topBar}>
          <p className={styles.info}>
            {loading ? 'Conectando…' : connected
              ? `${pedidos.length} comanda${pedidos.length !== 1 ? 's' : ''} activa${pedidos.length !== 1 ? 's' : ''} · actualiza cada 5 s`
              : 'Error de conexión'}
          </p>
          <span className={styles.badge}
            style={connected ? { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' } : undefined}>
            {connected ? '🟢 Conectado' : '🔴 Sin conexión'}
          </span>
        </div>

        <div className={styles.layout}>

          {/* ── Panel KDS ── */}
          <section className={styles.kdsPanel}>
            <h2 className={styles.panelTitle}>Comandas activas</h2>
            <div className={styles.grid}>
              {!loading && pedidos.length === 0 && (
                <div className={styles.emptyCard}>
                  <span>🍳</span>
                  <p>Sin comandas pendientes</p>
                </div>
              )}

              {pedidos.map((pedido) => {
                const color = ESTADO_COLOR[pedido.estado] ?? '#6b7280';
                const enProceso = actualizando === pedido.id;
                return (
                  <div key={pedido.id} className={styles.card}
                    style={{ borderColor: pedido.estado === 'pendiente' ? '#bfdbfe' : '#fde68a' }}>
                    <div className={styles.cardHeader}>
                      <span className={styles.pedidoId}>#{pedido.id}</span>
                      <span className={styles.mesa}>{ubicacion(pedido)}</span>
                      <span className={styles.hora}>{formatHora(pedido.fechaHora)}</span>
                    </div>

                    <ul className={styles.items}>
                      {(pedido.detalles ?? []).map((d) => (
                        <li key={d.id}>
                          <strong>{d.cantidad}×</strong> {d.plato.nombre}
                          {d.personalizacion && (
                            <span className={styles.personTag}>
                              {(() => {
                                try {
                                  const p = JSON.parse(d.personalizacion);
                                  const pts: string[] = [];
                                  if (p.removidos?.length) pts.push(`Sin: ${p.removidos.join(', ')}`);
                                  if (p.extras?.length)    pts.push(`+ ${p.extras.map((e: { nombre: string; cantidad: number }) => `${e.nombre}×${e.cantidad}`).join(', ')}`);
                                  if (p.nota)              pts.push(`✏️ ${p.nota}`);
                                  return pts.join(' · ');
                                } catch { return d.personalizacion; }
                              })()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.cardFooter}>
                      <span className={styles.estado}
                        style={{ background: `${color}18`, color }}>
                        {ESTADO_LABEL[pedido.estado] ?? pedido.estado}
                      </span>
                      <button className={styles.btnAccion}
                        onClick={() => handleAccion(pedido)} disabled={enProceso}>
                        {enProceso ? '…' : pedido.estado === 'pendiente' ? 'Comenzar' : 'Marcar listo'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Panel despacho ── */}
          {(despacho.length > 0 || !loading) && (
            <section className={styles.despachoPanel}>
              <h2 className={styles.panelTitle}>
                📦 Cola de despacho
                {despacho.length > 0 && (
                  <span className={styles.despachoCount}>{despacho.length}</span>
                )}
              </h2>

              {despacho.length === 0 ? (
                <p className={styles.despachoVacio}>Sin domicilios listos por ahora.</p>
              ) : (
                <>
                  <p className={styles.despachoHint}>
                    Selecciona pedidos con rutas cercanas y asígnalos a un domiciliario.
                  </p>

                  <div className={styles.despachoList}>
                    {despacho.map((p) => {
                      const mins = minutosDesde(horaListo(p));
                      const urgente = mins >= 8;
                      const sel = seleccionados.has(p.id);
                      return (
                        <label key={p.id}
                          className={`${styles.despachoCard} ${sel ? styles.despachoCardSel : ''} ${urgente ? styles.despachoCardUrgente : ''}`}>
                          <input type="checkbox" className={styles.check}
                            checked={sel} onChange={() => toggleSeleccion(p.id)} />

                          <div className={styles.despachoInfo}>
                            <div className={styles.despachoHeader}>
                              <span className={styles.pedidoId}>#{p.id}</span>
                              <span className={`${styles.timerBadge} ${urgente ? styles.timerUrgente : ''}`}>
                                {urgente ? '⚠️' : '⏱'} {mins} min
                              </span>
                            </div>

                            {p.cliente && (
                              <p className={styles.despachoCliente}>👤 {p.cliente.nombre}</p>
                            )}
                            {p.direccionEntrega && (
                              <p className={styles.despachoDir}>📍 {p.direccionEntrega}</p>
                            )}
                            <p className={styles.despachoItems}>
                              {(p.detalles ?? []).map((d) => `${d.cantidad}× ${d.plato.nombre}`).join(' · ')}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Acción despacho */}
                  <div className={styles.despachoActions}>
                    <select
                      className={styles.selectDomiciliario}
                      value={domiciliarioId}
                      onChange={(e) => setDomiciliarioId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Elegir domiciliario…</option>
                      {domiciliarios.map((d) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>

                    <button
                      className={styles.btnDespachar}
                      onClick={handleDespachar}
                      disabled={despachando || seleccionados.size === 0 || !domiciliarioId}
                    >
                      {despachando
                        ? 'Despachando…'
                        : `🛵 Despachar ${seleccionados.size > 0 ? `(${seleccionados.size})` : ''}`}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}