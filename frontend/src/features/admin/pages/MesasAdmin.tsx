import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalClose } from '@/shared/hooks/useModalClose';
import { QRCodeCanvas } from 'qrcode.react';
import { AdminLayout } from '../components/AdminLayout';
import {
  fetchMesasAdmin, createMesa, deleteMesa, updateMesaAdmin, fetchPedidos,
  type ApiMesa, type EstadoMesa,
} from '../services/admin.service';
import styles from './MesasAdmin.module.css';

type FiltroMesa = 'todas' | 'libre' | 'ocupada';

function getMenuUrl(mesaId: number) { return `${window.location.origin}/menu?mesa=${mesaId}`; }

/* ── QR individual ── */
function MesaQR({ mesa }: { mesa: ApiMesa }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const url = getMenuUrl(mesa.id);
  function handleDescargar() {
    const canvas = document.getElementById(`qr-mesa-${mesa.id}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-mesa-${mesa.numero}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
  return (
    <div className={styles.qrInner}>
      <QRCodeCanvas id={`qr-mesa-${mesa.id}`} value={url} size={200} marginSize={2} level="M" ref={canvasRef} />
      <p className={styles.qrUrl}>{url}</p>
      <button className="adm-btn adm-btn-primary" onClick={handleDescargar}>
        <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>
        Descargar PNG
      </button>
    </div>
  );
}

/* ── Modal QR ── */
function QrModal({ mesa, onClose }: { mesa: ApiMesa; onClose: () => void }) {
  const { backdropProps } = useModalClose(onClose);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);
  return createPortal(
    <div className="adm-overlay" {...backdropProps}>
      <div className="adm-modal-box" onClick={e => e.stopPropagation()}>
        <div className={styles.qrPanelHeader}>
          <div>
            <div className={styles.qrPanelTitle}>Mesa {mesa.numero}</div>
            <div className={styles.qrPanelSub}>Los clientes escanean este código para ver el menú y pedir</div>
          </div>
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>✕ Cerrar</button>
        </div>
        <MesaQR mesa={mesa} />
      </div>
    </div>,
    document.body
  );
}

/* ── Componente principal ── */
export function MesasAdmin() {
  const [mesas,        setMesas       ] = useState<ApiMesa[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [nuevaNum,     setNuevaNum    ] = useState('');
  const [creando,      setCreando     ] = useState(false);
  const [errorMsg,     setErrorMsg    ] = useState('');
  const [qrAbierto,    setQrAbierto   ] = useState<number | null>(null);
  const [filtro,       setFiltro      ] = useState<FiltroMesa>('todas');
  const [busqueda,     setBusqueda    ] = useState('');
  const [showNueva,    setShowNueva   ] = useState(false);
  const [pedidosPorMesa, setPedidosPorMesa] = useState<Record<number, number>>({});
  const [pedidosHoy,   setPedidosHoy  ] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [mesasData, todosLosPedidos] = await Promise.all([fetchMesasAdmin(), fetchPedidos()]);
      setMesas(mesasData);
      // Contar pedidos por mesa y pedidos vía QR de hoy
      const hoy = new Date().toDateString();
      const porMesa: Record<number, number> = {};
      let hoyCount = 0;
      for (const p of todosLosPedidos) {
        if (p.tipo === 'mesa' && p.mesa) {
          porMesa[p.mesa.numero] = (porMesa[p.mesa.numero] ?? 0) + 1;
          if (new Date(p.fechaHora).toDateString() === hoy) hoyCount++;
        }
      }
      setPedidosPorMesa(porMesa);
      setPedidosHoy(hoyCount);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function handleCrear() {
    const num = parseInt(nuevaNum); if (isNaN(num) || num < 1) return;
    setCreando(true); setErrorMsg('');
    try {
      const nueva = await createMesa(num);
      setMesas(prev => [...prev, nueva].sort((a, b) => a.numero - b.numero));
      setNuevaNum(''); setShowNueva(false);
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Error al crear la mesa'); }
    finally { setCreando(false); }
  }

  async function handleEliminar(mesa: ApiMesa) {
    if (!confirm(`¿Eliminar Mesa ${mesa.numero}?`)) return;
    try {
      await deleteMesa(mesa.id);
      setMesas(prev => prev.filter(m => m.id !== mesa.id));
      if (qrAbierto === mesa.id) setQrAbierto(null);
    } catch (err) { alert(err instanceof Error ? err.message : 'No se pudo eliminar'); }
  }

  async function handleCambiarEstado(mesa: ApiMesa, estado: EstadoMesa) {
    try {
      const act = await updateMesaAdmin(mesa.id, { estado });
      setMesas(prev => prev.map(m => m.id === mesa.id ? act : m));
    } catch (err) { console.error(err); }
  }

  function handleDescargarTodos() {
    if (mesas.length === 0) return;

    // Parámetros de la hoja
    const QR_PX   = 200;
    const PAD     = 24;
    const LABEL_H = 40;
    const CELL_W  = QR_PX + PAD * 2;
    const CELL_H  = QR_PX + LABEL_H + PAD * 2;
    const COLS    = Math.min(mesas.length, 4);
    const ROWS    = Math.ceil(mesas.length / COLS);

    const sheet = document.createElement('canvas');
    sheet.width  = COLS * CELL_W;
    sheet.height = ROWS * CELL_H;
    const ctx = sheet.getContext('2d')!;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheet.width, sheet.height);

    mesas.forEach((mesa, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = col * CELL_W + PAD;
      const y   = row * CELL_H + PAD;

      // QR desde canvas oculto
      const src = document.getElementById(`qr-dl-${mesa.id}`) as HTMLCanvasElement | null;
      if (src) ctx.drawImage(src, x, y, QR_PX, QR_PX);

      // Etiqueta "Mesa X"
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Mesa ${mesa.numero}`, x + QR_PX / 2, y + QR_PX + 22);

      // URL pequeña
      ctx.fillStyle = '#78716c';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(getMenuUrl(mesa.id).replace(window.location.origin, ''), x + QR_PX / 2, y + QR_PX + 36);
    });

    const link = document.createElement('a');
    link.download = `qr-mesas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = sheet.toDataURL('image/png');
    link.click();
  }

  const mesasFiltradas = mesas.filter(m => {
    const matchFiltro = filtro === 'todas' || m.estado === filtro;
    const matchBusq   = !busqueda || String(m.numero).includes(busqueda);
    return matchFiltro && matchBusq;
  });

  const libres   = mesas.filter(m => m.estado === 'libre').length;
  const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
  const mesaActiva = qrAbierto !== null ? mesas.find(m => m.id === qrAbierto) : null;

  // Tiles QR ocultos para descarga masiva
  const hiddenQRs = mesas.map(m => (
    <div key={m.id} style={{ display: 'none' }}>
      <QRCodeCanvas id={`qr-dl-${m.id}`} value={getMenuUrl(m.id)} size={200} marginSize={2} level="M" />
    </div>
  ));

  return (
    <AdminLayout title="Mesas y QR" subtitle="Estados de mesa y códigos QR">
      <div className="adm-view">

        {/* ── KPIs ── */}
        <div className="adm-cols-3" style={{ marginBottom: 22 }}>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Mesas con QR</div>
              <div className="adm-tile sage" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9h16M5 9 4 4M19 9l1-5M7 9v11M17 9v11M9.5 9v5h5V9"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : mesas.length}</div>
            <div className="adm-kpi-foot"><span className="muted">Todas activas</span></div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Ocupadas ahora</div>
              <div className="adm-tile rose" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : ocupadas}</div>
            <div className="adm-kpi-foot"><span className="muted">Con pedido en curso</span></div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Pedidos vía QR hoy</div>
              <div className="adm-tile amber" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 12h10L20 8H6"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : pedidosHoy}</div>
            <div className="adm-kpi-foot"><span className="muted">Pedidos hoy vía mesa</span></div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="adm-toolbar">
          <div className="adm-search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input placeholder="Buscar mesa…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          {/* Seg: Todas / Libres / Ocupadas */}
          <div className="adm-seg">
            <button className={filtro === 'todas'   ? 'active' : ''} onClick={() => setFiltro('todas')}>Todas</button>
            <button className={filtro === 'libre'   ? 'active' : ''} onClick={() => setFiltro('libre')}>Libres</button>
            <button className={filtro === 'ocupada' ? 'active' : ''} onClick={() => setFiltro('ocupada')}>Ocupadas</button>
          </div>
          <div className="adm-toolbar-spacer" />
          <button className="adm-btn adm-btn-ghost" onClick={handleDescargarTodos}>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>
            Descargar todos
          </button>
          <button className="adm-btn adm-btn-primary" onClick={() => { setShowNueva(true); setNuevaNum(''); setErrorMsg(''); }}>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nueva mesa
          </button>
        </div>

        {/* ── Grid de mesas — diseño fiel a la referencia ── */}
        {loading ? (
          <div className="adm-loading">Cargando mesas…</div>
        ) : mesasFiltradas.length === 0 ? (
          <div className="adm-empty">{mesas.length === 0 ? 'No hay mesas. Agrega la primera.' : 'No hay mesas con ese filtro.'}</div>
        ) : (
          <div className={styles.grid}>
            {mesasFiltradas.map(mesa => {
              const libre = mesa.estado === 'libre';
              return (
                <div key={mesa.id} className={styles.card}>
                  {/* Top: QR tile + chip estado */}
                  <div className={styles.cardTop}>
                    <div
                      className={`adm-tile ${libre ? 'sage' : 'rose'}`}
                      style={{ width: 40, height: 40, borderRadius: 11 }}
                    >
                      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/>
                        <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/>
                      </svg>
                    </div>
                    <span className={libre ? 'adm-chip adm-chip-ok' : 'adm-chip adm-chip-bad'}>
                      <span className="adm-chip-dot" />
                      {libre ? 'Libre' : 'Ocupada'}
                    </span>
                  </div>

                  {/* "Mesa X" grande */}
                  <div className={styles.mesaNum}>Mesa {mesa.numero}</div>

                  {/* Cart + pedidos vía QR */}
                  <div className={styles.pedidosRow}>
                    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--adm-muted)', opacity: 0.5 }}>
                      <circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>
                      <path d="M3 4h2l2.5 12h10L20 8H6"/>
                    </svg>
                    <span className={styles.pedidosText}>{pedidosPorMesa[mesa.numero] ?? 0} pedidos vía QR</span>
                  </div>

                  {/* Acciones: Ver QR + descargar + editar estado + eliminar */}
                  <div className={styles.cardActions}>
                    <button className={styles.btnVerQr} onClick={() => setQrAbierto(mesa.id)}>
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg>
                      Ver QR
                    </button>
                    <button className="adm-mini-btn" title="Descargar QR"
                      onClick={() => {
                        const c = document.getElementById(`qr-dl-${mesa.id}`) as HTMLCanvasElement | null;
                        if (!c) { setQrAbierto(mesa.id); return; }
                        const link = document.createElement('a');
                        link.download = `qr-mesa-${mesa.numero}.png`;
                        link.href = c.toDataURL('image/png');
                        link.click();
                      }}>
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>
                    </button>
                    <button className="adm-mini-btn" title={libre ? 'Marcar ocupada' : 'Marcar libre'}
                      onClick={() => handleCambiarEstado(mesa, libre ? 'ocupada' : 'libre')}>
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 5l5 5M4 20l1-4L16 5l3 3L8 19l-4 1Z"/></svg>
                    </button>
                    <button className="adm-mini-btn danger" title="Eliminar" onClick={() => handleEliminar(mesa)}>
                      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="adm-count">{mesasFiltradas.length} mesa{mesasFiltradas.length !== 1 ? 's' : ''} · {libres} libres · {ocupadas} ocupadas</p>
      </div>

      {/* Canvases ocultos para descarga masiva */}
      {hiddenQRs}

      {/* ── Modal Nueva mesa ── */}
      {showNueva && (
        <div className="adm-overlay" onClick={() => setShowNueva(false)}>
          <div className="adm-modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Nueva mesa</div>
            <div className="adm-modal-form">
              <div className="adm-modal-field">
                <label>Número de mesa</label>
                <input type="number" className="adm-input" autoFocus
                  placeholder="Ej: 5" value={nuevaNum}
                  onChange={e => setNuevaNum(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCrear()}
                  min={1} />
              </div>
              {errorMsg && <p className="adm-error">{errorMsg}</p>}
            </div>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setShowNueva(false)}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleCrear} disabled={creando || !nuevaNum}>
                {creando ? 'Creando…' : 'Agregar mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal QR ── */}
      {mesaActiva && <QrModal mesa={mesaActiva} onClose={() => setQrAbierto(null)} />}
    </AdminLayout>
  );
}
