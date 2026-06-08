import { useCallback, useEffect, useState } from 'react';
import { useRealtimePedidos } from '@/shared/hooks/useRealtimePedidos';
import { AppShell } from '@/shared/components/AppShell';
import {
  fetchPedidosCocina, marcarEnCocina, marcarListo,
  fetchPedidosDespacho, fetchDomiciliarios, despacharRuta,
} from '../services/cocina.service';
import type { ApiPedido, ApiStaff } from '@/features/admin/services/admin.service';
import styles from './CocinaDashboard.module.css';

// ── SVG Icons ─────────────────────────────────────────────────────────────

const Ic = {
  flame: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3 .5 2 2 2 2 2s-1-4 2-8Z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5 10 17.5 19.5 7" />
    </svg>
  ),
  checkCircle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M8 12.5 11 15.5 16 9.5" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17.5v.5" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </svg>
  ),
  delivery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="18" r="2.5" /><circle cx="17" cy="18" r="2.5" />
      <path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5" />
    </svg>
  ),
  tables: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h16M5 9 4 4M19 9l1-5M7 9v11M17 9v11M9.5 9v5h5V9" />
    </svg>
  ),
  box2: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  dish: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11a9 9 0 0 1 18 0Z" /><path d="M2 11h20M12 6V3M11 3h2" />
    </svg>
  ),
};

// ── Helpers ────────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { cls: string; icon: keyof typeof Ic; label: string }> = {
  mesa:      { cls: styles.tagLocal,     icon: 'tables',   label: 'En local'      },
  llevar:    { cls: styles.tagLlevar,    icon: 'box2',     label: 'Para llevar'   },
  domicilio: { cls: styles.tagDomicilio, icon: 'delivery', label: 'Domicilio'     },
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function tiempoTranscurrido(iso: string): { texto: string; mins: number } {
  const fecha = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? new Date(iso) : new Date(iso + 'Z');
  const s = Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return { texto: `${m}:${ss}`, mins: m };
}

function minutosDespacho(iso: string) {
  const fecha = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? new Date(iso) : new Date(iso + 'Z');
  return Math.floor((Date.now() - fecha.getTime()) / 60000);
}

function horaListo(p: ApiPedido): string {
  const entrada = p.historial
    ?.filter((h) => h.estado === 'listo')
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())[0];
  return entrada?.fechaHora ?? p.fechaHora;
}

function ubicacion(p: ApiPedido) {
  if (p.tipo === 'mesa' && p.mesa) return `Mesa ${p.mesa.numero}`;
  return TIPO_META[p.tipo]?.label ?? p.tipo;
}

// ── Timer pill ─────────────────────────────────────────────────────────────

function TimerPill({ iso }: { iso: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { texto, mins } = tiempoTranscurrido(iso);
  const cls = mins >= 11 ? styles.timerLate : mins >= 6 ? styles.timerWarn : styles.timerOk;
  void tick;
  return (
    <span className={`${styles.timer} ${cls}`}>
      {Ic.clock}
      {texto}
    </span>
  );
}

// ── Subcomponente PedidoCard ───────────────────────────────────────────────

function PedidoCard({
  pedido,
  actualizando,
  onAccion,
}: {
  pedido: ApiPedido;
  actualizando: number | null;
  onAccion: (p: ApiPedido) => void;
}) {
  const enProceso = actualizando === pedido.id;
  const esPendiente = pedido.estado === 'pendiente';
  const tipo = TIPO_META[pedido.tipo];

  // Collect personalizations for note block
  const notas = (pedido.detalles ?? [])
    .map((d) => {
      if (!d.personalizacion) return null;
      try {
        const pr = JSON.parse(d.personalizacion);
        const pts: string[] = [];
        if (pr.removidos?.length) pts.push(`Sin: ${pr.removidos.join(', ')}`);
        if (pr.extras?.length)
          pts.push(`+ ${pr.extras.map((e: { nombre: string; cantidad: number }) => `${e.nombre}×${e.cantidad}`).join(', ')}`);
        if (pr.nota) pts.push(pr.nota);
        return pts.length ? `${d.plato.nombre}: ${pts.join(' · ')}` : null;
      } catch {
        return d.personalizacion;
      }
    })
    .filter(Boolean);

  const isLate = tiempoTranscurrido(pedido.fechaHora).mins >= 11;

  return (
    <div className={`${styles.cmd} ${esPendiente ? styles.cmdRecv : ''} ${isLate ? styles.cmdLate : ''}`}>
      <div className={styles.cmdTop}>
        <span className={styles.cmdId}>#{pedido.id}</span>
        <TimerPill iso={pedido.fechaHora} />
      </div>

      <div className={styles.cmdMeta}>
        {tipo && (
          <span className={`${styles.tag} ${tipo.cls}`}>
            {Ic[tipo.icon]}
            {tipo.label}
          </span>
        )}
        <span className={styles.cmdWho}>{ubicacion(pedido)}</span>
      </div>

      <div className={styles.cmdItems}>
        {(pedido.detalles ?? []).map((d) => (
          <div key={d.id} className={styles.cmdItem}>
            <span className={`${styles.qty} ${d.cantidad >= 4 ? styles.qtyBig : ''}`}>
              {d.cantidad}×
            </span>
            <div className={styles.itName}>{d.plato.nombre}</div>
          </div>
        ))}
      </div>

      {notas.length > 0 && (
        <div className={styles.cmdNote}>
          {Ic.alert}
          <span>{notas.join(' | ')}</span>
        </div>
      )}

      <div className={styles.cmdFoot}>
        {esPendiente ? (
          <button
            className={styles.btnPrimary}
            onClick={() => onAccion(pedido)}
            disabled={enProceso}
          >
            {enProceso ? '…' : <>{Ic.flame} Empezar a preparar</>}
          </button>
        ) : (
          <button
            className={styles.btnOk}
            onClick={() => onAccion(pedido)}
            disabled={enProceso}
          >
            {enProceso ? '…' : <>{Ic.check} Marcar listo</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export function CocinaDashboard() {
  const [pedidos,       setPedidos      ] = useState<ApiPedido[]>([]);
  const [despacho,      setDespacho     ] = useState<ApiPedido[]>([]);
  const [domiciliarios, setDomiciliarios] = useState<ApiStaff[]>([]);
  const [loading,       setLoading      ] = useState(true);
  const [connected,     setConnected    ] = useState(false);
  const [actualizando,  setActualizando ] = useState<number | null>(null);

  const [seleccionados,  setSeleccionados ] = useState<Set<number>>(new Set());
  const [domiciliarioId, setDomiciliarioId] = useState<number | ''>('');
  const [despachando,    setDespachando   ] = useState(false);

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

  useEffect(() => { cargar(); }, [cargar]);
  useRealtimePedidos(cargar);

  // ── Acciones KDS ─────────────────────────────────────────────────────────

  async function handleAccion(pedido: ApiPedido) {
    setActualizando(pedido.id);
    try {
      const actualizado =
        pedido.estado === 'pendiente'
          ? await marcarEnCocina(pedido.id)
          : await marcarListo(pedido.id);

      if (actualizado.estado === 'listo') {
        setPedidos((prev) => prev.filter((p) => p.id !== actualizado.id));
        if (actualizado.tipo === 'domicilio') {
          setDespacho((prev) => [...prev, actualizado]);
        }
      } else {
        setPedidos((prev) =>
          prev.map((p) => (p.id === actualizado.id ? actualizado : p))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActualizando(null);
    }
  }

  // ── Acciones despacho ────────────────────────────────────────────────────

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

  // ── Columnas Kanban ───────────────────────────────────────────────────────

  const recibidos = pedidos.filter((p) => p.estado === 'pendiente');
  const enCocina  = pedidos.filter((p) => p.estado === 'en_cocina');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="KDS · Cocina">
      <div className={styles.wrapper}>

        {/* Sub-header */}
        <div className={styles.subHeader}>
          <p className={styles.info}>
            {loading
              ? 'Conectando…'
              : <><b>{pedidos.length} comanda{pedidos.length !== 1 ? 's' : ''} activa{pedidos.length !== 1 ? 's' : ''}</b> · en tiempo real</>}
          </p>
          <div className={styles.spacer} />
          <span className={`${styles.connPill} ${!connected ? styles.connPillOff : ''}`}>
            <span className={`${styles.connDot} ${!connected ? styles.connDotOff : ''}`} />
            {connected ? 'Conectado' : 'Sin conexión'}
          </span>
        </div>

        {/* Main layout */}
        <div className={styles.layout}>

          {/* KDS Kanban */}
          <div>
            <h2 className={styles.kdsTitle}>Comandas activas</h2>
            <div className={styles.kanban}>

              {/* Col 1 — Recibido */}
              <div className={styles.kcol}>
                <div className={styles.kcolHead}>
                  <span className={`${styles.kcolDot} ${styles.kcolDotRecv}`} />
                  <span className={styles.kcolTitle}>Recibido</span>
                  <span className={`${styles.kcolCount} ${styles.kcolCountRecv}`}>{recibidos.length}</span>
                </div>
                <div className={styles.kcolBody}>
                  {!loading && recibidos.length === 0 ? (
                    <div className={styles.kempty}>{Ic.dish}<div>Sin comandas</div></div>
                  ) : (
                    recibidos.map((p) => (
                      <PedidoCard key={p.id} pedido={p} actualizando={actualizando} onAccion={handleAccion} />
                    ))
                  )}
                </div>
              </div>

              {/* Col 2 — En preparación */}
              <div className={styles.kcol}>
                <div className={styles.kcolHead}>
                  <span className={`${styles.kcolDot} ${styles.kcolDotPrep}`} />
                  <span className={styles.kcolTitle}>En preparación</span>
                  <span className={`${styles.kcolCount} ${styles.kcolCountPrep}`}>{enCocina.length}</span>
                </div>
                <div className={styles.kcolBody}>
                  {!loading && enCocina.length === 0 ? (
                    <div className={styles.kempty}>{Ic.dish}<div>Sin comandas</div></div>
                  ) : (
                    enCocina.map((p) => (
                      <PedidoCard key={p.id} pedido={p} actualizando={actualizando} onAccion={handleAccion} />
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Dispatch panel — siempre visible */}
          <aside className={styles.dispatch}>
              <div className={styles.dispHead}>
                {Ic.box}
                <h3>Cola de despacho</h3>
                <span className={styles.dispCount}>{despacho.length}</span>
              </div>
              <p className={styles.dispSub}>
                Selecciona pedidos con rutas cercanas y asígnalos a un domiciliario.
              </p>

              <div className={styles.dispList}>
                {despacho.length === 0 ? (
                  <div className={styles.dispEmpty}>No hay pedidos listos para despachar</div>
                ) : (
                  despacho.map((p) => {
                    const mins = minutosDespacho(horaListo(p));
                    const urgente = mins >= 8;
                    const sel = seleccionados.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`${styles.dispCard} ${sel ? styles.dispCardSel : ''}`}
                        onClick={() => toggleSeleccion(p.id)}
                      >
                        <div className={styles.dispCheck}>{sel && Ic.check}</div>
                        <div className={styles.dispMain}>
                          <div className={styles.dispRow1}>
                            <span className={styles.dispId}>#{p.id}</span>
                            <span className={`${styles.dispTimerPill} ${urgente ? styles.dispTimerUrgente : ''}`}>
                              {Ic.clock}{mins} min
                            </span>
                          </div>
                          {p.direccionEntrega && (
                            <div className={styles.dispAddr}>{Ic.pin}{p.direccionEntrega}</div>
                          )}
                          <div className={styles.dispItems}>
                            {(p.detalles ?? []).map((d) => `${d.cantidad}× ${d.plato.nombre}`).join(' · ')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={styles.dispField}>
                <label>Asignar a</label>
                <select
                  className={styles.dispSelect}
                  value={domiciliarioId}
                  onChange={(e) => setDomiciliarioId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Elegir domiciliario…</option>
                  {domiciliarios.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              <button
                className={styles.btnDespachar}
                onClick={handleDespachar}
                disabled={despachando || seleccionados.size === 0 || !domiciliarioId}
              >
                {Ic.delivery}
                {despachando ? 'Despachando…' : `Despachar${seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}`}
              </button>
            </aside>

        </div>
      </div>
    </AppShell>
  );
}
