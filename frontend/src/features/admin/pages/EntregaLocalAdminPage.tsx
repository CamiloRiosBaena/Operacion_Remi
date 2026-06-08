import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AdminLayout } from '../components/AdminLayout';
import { useRealtimePedidos } from '@/shared/hooks/useRealtimePedidos';
import {
  fetchPedidos,
  asignarCasillero,
  cambiarEstadoPedido,
  infoPedidoPorToken,
  confirmarEntregaConToken,
  type ApiPedido,
} from '../services/admin.service';
import styles from './EntregaLocalAdminPage.module.css';

/* ── Serial API types ── */
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}
declare global {
  interface Navigator {
    serial?: { requestPort(): Promise<SerialPort>; getPorts(): Promise<SerialPort[]> };
  }
}

/* ── Icons ── */
const PATHS: Record<string, string> = {
  box:         '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  locker:      '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M5 12h14"/><path d="M15 7.5v1M15 15.5v1"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5 11 15.5 16 9.5"/>',
  key:         '<circle cx="8" cy="15" r="4"/><path d="M11 13 20 4M17 7l2.5 2.5M14.5 9.5 17 12"/>',
  unlock:      '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/><path d="M12 15v2"/>',
  plug:        '<path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0Z"/><path d="M12 16v6"/>',
  power:       '<path d="M12 4v8M7.5 7a7 7 0 1 0 9 0"/>',
  alert:       '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.5"/>',
  scan:        '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
};

function Icon({ name, size = 19, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? '' }} />
  );
}

function formatPrecio(n: number) { return `$${Number(n).toLocaleString('es-CO')}`; }
function formatHora(iso: string) { return new Date(iso).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); }
function labelPedido(p: ApiPedido) {
  if (p.tipo === 'mesa' && p.mesa) return `Mesa ${p.mesa.numero}`;
  if (p.cliente) return p.cliente.nombre;
  return 'Invitado';
}

/* ── Toast ── */
type ToastType = 'ok' | 'warn';
interface ToastMsg { id: number; msg: string; type: ToastType }

export function EntregaLocalAdminPage() {
  /* ── Pedidos listos ── */
  const [pedidos,     setPedidos    ] = useState<ApiPedido[]>([]);
  const [loading,     setLoading    ] = useState(true);
  const [asignando,   setAsignando  ] = useState<number | null>(null);
  const [entregando,  setEntregando ] = useState<number | null>(null);

  /* ── Arduino ── */
  const serialPortRef = useRef<SerialPort | null>(null);
  const [arduino,     setArduino    ] = useState(false);
  const [ardError,    setArdError   ] = useState('');
  const arduinoRef    = useRef(false);
  useEffect(() => { arduinoRef.current = arduino; }, [arduino]);

  /* ── Scanner QR inline ── */
  const scannerRef    = useRef<Html5Qrcode | null>(null);
  const obsRef        = useRef<MutationObserver | null>(null);
  const [scanning,    setScanning   ] = useState(false);
  const [scanError,   setScanError  ] = useState('');

  useEffect(() => () => {
    obsRef.current?.disconnect();
    scannerRef.current?.stop().catch(() => {});
  }, []);

  /* ── Toasts ── */
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((msg: string, type: ToastType = 'ok') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  /* ── Carga de pedidos ── */
  const cargarPedidos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const todos = await fetchPedidos();
      setPedidos(todos.filter(p =>
        p.estado === 'listo' && (p.tipo === 'mesa' || p.tipo === 'llevar')
      ));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);
  useRealtimePedidos(() => cargarPedidos(true));

  useEffect(() => () => { serialPortRef.current?.close().catch(()=>{}); serialPortRef.current = null; }, []);

  /* ── Arduino ── */
  async function conectarArduino() {
    if (!navigator.serial) { setArdError('Tu navegador no soporta Web Serial API. Usa Chrome o Edge.'); return; }
    try {
      setArdError('');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      serialPortRef.current = port;
      setArduino(true);
      toast('Arduino conectado · 9600 baud', 'ok');
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'NotFoundError') {
        setArdError('No se pudo conectar: ' + e.message);
      }
    }
  }

  async function desconectarArduino() {
    try { await serialPortRef.current?.close(); } catch { /* ignorar */ }
    serialPortRef.current = null;
    setArduino(false);
    toast('Arduino desconectado', 'warn');
  }

  async function enviarComando(casillero: 'X' | 'Y') {
    const port = serialPortRef.current;
    if (!port?.writable) throw new Error('Arduino no conectado');
    const writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode(casillero + '\n'));
    writer.releaseLock();
  }

  /* ── Iniciar escáner QR inline ── */
  async function iniciarScan() {
    setScanError('');
    setScanning(true);
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    const scanner = new Html5Qrcode('qr-local-inline');
    scannerRef.current = scanner;
    const cfg = { fps: 10, qrbox: { width: 240, height: 240 } };

    const onDecode = async (texto: string) => {
      try { await scanner.stop(); scannerRef.current = null; } catch {}
      setScanning(false);
      const token = (() => {
        try { return new URL(texto).searchParams.get('token') ?? texto.trim(); }
        catch { return texto.trim(); }
      })();
      if (!token) { setScanError('El QR escaneado no es válido.'); return; }
      try {
        const info = await infoPedidoPorToken(token);
        await confirmarEntregaConToken(token);
        if (info.casillero && arduinoRef.current) {
          enviarComando(info.casillero).catch(() => {});
        }
        setPedidos(prev => prev.filter(p => p.id !== info.id));
        toast(`Pedido #${info.id} entregado${info.casillero ? ` · Casillero ${info.casillero} abierto` : ''}`, 'ok');
      } catch (e: unknown) {
        setScanError(e instanceof Error ? e.message : 'Error al procesar el QR');
      }
    };

    const startWith = async (mode: ConstrainDOMStringParameters) =>
      scanner.start(mode, cfg, onDecode, () => {});

    try { await startWith({ facingMode: 'environment' }); }
    catch {
      try { await startWith({ facingMode: 'user' }); }
      catch {
        try { await scanner.stop(); } catch {}
        scannerRef.current = null;
        setScanning(false);
        setScanError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
        return;
      }
    }

    // MutationObserver: cada vez que html5-qrcode toque el style del video,
    // forzamos transform:none con !important para eliminar el efecto espejo.
    const fixMirror = () => {
      document.querySelectorAll<HTMLVideoElement>('#qr-local-inline video').forEach(v => {
        v.style.setProperty('transform', 'none', 'important');
      });
    };
    fixMirror();
    const el = document.getElementById('qr-local-inline');
    if (el) {
      obsRef.current?.disconnect();
      const obs = new MutationObserver(fixMirror);
      obs.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
      obsRef.current = obs;
    }
  }

  async function detenerScan() {
    obsRef.current?.disconnect();
    obsRef.current = null;
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  /* ── Asignar casillero ── */
  async function handleAsignar(pedidoId: number, cas: 'X' | 'Y' | null) {
    setAsignando(pedidoId);
    try {
      const actualizado = await asignarCasillero(pedidoId, cas);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, casillero: actualizado.casillero } : p));
      if (cas) toast(`Casillero ${cas} asignado al pedido #${pedidoId}`, 'ok');
    } catch (err) {
      toast('Error al asignar casillero', 'warn');
      console.error(err);
    } finally { setAsignando(null); }
  }

  /* ── Abrir casillero (marcar entregado) ── */
  async function handleAbrir(pedido: ApiPedido) {
    if (!pedido.casillero) { toast('Este pedido no tiene casillero asignado', 'warn'); return; }
    setEntregando(pedido.id);
    try {
      if (arduino) {
        try { await enviarComando(pedido.casillero as 'X' | 'Y'); } catch { /* no bloquear */ }
      }
      await cambiarEstadoPedido(pedido.id, 'entregado');
      setPedidos(prev => prev.filter(p => p.id !== pedido.id));
      toast(`Casillero ${pedido.casillero} abierto · pedido #${pedido.id} entregado`, 'ok');
    } catch (err) {
      toast('Error al abrir el casillero', 'warn');
      console.error(err);
    } finally { setEntregando(null); }
  }

  /* ── Emergencia: abrir sin QR ── */
  async function abrirEmergencia(cas: 'X' | 'Y') {
    if (!arduino) { toast('Conecta el Arduino primero', 'warn'); return; }
    try { await enviarComando(cas); toast(`Casillero ${cas} abierto (emergencia)`, 'ok'); }
    catch (err) { toast('Error al enviar comando', 'warn'); console.error(err); }
  }

  /* ── Stats derivadas ── */
  const casilleroX = pedidos.find(p => p.casillero === 'X');
  const casilleroY = pedidos.find(p => p.casillero === 'Y');
  const sinCasillero = pedidos.filter(p => !p.casillero);
  const entregadosHoy = 0; // sin endpoint específico, se podría calcular

  return (
    <AdminLayout title="Entrega en Local" subtitle="Casilleros con QR y Arduino">
      <div className="adm-view">

        {/* ── Arduino bar ── */}
        <div className={`${styles.ardBar} ${arduino ? styles.on : ''}`}>
          <span className={styles.ardLed} />
          <span>
            <span className={styles.ardText}>{arduino ? 'Arduino conectado' : 'Arduino desconectado'}</span>
            {!arduino && <span className={styles.ardMeta}> — controlador de casilleros</span>}
          </span>
          {arduino && (
            <span className={styles.ardPort}>
              <Icon name="plug" size={15} /> 9600 baud
            </span>
          )}
          {arduino && (
            <>
              <button className="adm-btn adm-btn-ghost" onClick={() => abrirEmergencia('X')} style={{ marginLeft:8 }}>
                <Icon name="unlock" size={15}/> Emergencia X
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={() => abrirEmergencia('Y')}>
                <Icon name="unlock" size={15}/> Emergencia Y
              </button>
            </>
          )}
          <span className={styles.ardSpacer} />
          {ardError && <span style={{ fontSize:13, color:'var(--adm-bad)', fontFamily:'var(--adm-font-ui)' }}>{ardError}</span>}
          {arduino ? (
            <button className="adm-btn adm-btn-ghost" onClick={desconectarArduino}>
              <Icon name="power" size={17}/> Desconectar
            </button>
          ) : (
            <button className="adm-btn adm-btn-primary" onClick={conectarArduino}>
              <Icon name="plug" size={17}/> Conectar Arduino
            </button>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="adm-cols-3" style={{ marginBottom:22 }}>
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">En espera</div>
              <div className="adm-tile peach" style={{ width:36, height:36, borderRadius:10 }}>
                <Icon name="box" size={19}/>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : pedidos.length}</div>
            <div className="adm-kpi-foot"><span className="muted">Pedidos listos</span></div>
          </div>
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Con casillero</div>
              <div className="adm-tile sage" style={{ width:36, height:36, borderRadius:10 }}>
                <Icon name="locker" size={19}/>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{loading ? '…' : pedidos.filter(p=>p.casillero).length}</div>
            <div className="adm-kpi-foot"><span className="muted">{sinCasillero.length} sin asignar</span></div>
          </div>
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Entregados hoy</div>
              <div className="adm-tile amber" style={{ width:36, height:36, borderRadius:10 }}>
                <Icon name="checkCircle" size={19}/>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:27 }}>{entregadosHoy}</div>
            <div className="adm-kpi-foot"><span className="muted">Vía QR</span></div>
          </div>
        </div>

        {/* ── Layout principal ── */}
        <div className={styles.localGrid}>

          {/* Cola de pedidos */}
          <div>
            <div className={styles.queueHead}>
              <Icon name="box" size={20}/>
              <h3>Listos para entregar</h3>
              <span className={styles.countPill}>{pedidos.length}</span>
            </div>

            {loading ? <div className="adm-loading">Cargando…</div>
            : pedidos.length === 0 ? (
              <div className={styles.queueEmpty}>
                <Icon name="checkCircle" size={30}/>
                <div>No hay pedidos en espera</div>
              </div>
            ) : pedidos.map(p => (
              <div key={p.id} className={styles.orderCard}>
                <div className={styles.ocTop}>
                  <span className={styles.ocId}>#{p.id}</span>
                  <span className={`${styles.modeTag} ${p.tipo==='llevar' ? styles.modeLlevar : styles.modeLocal}`}>
                    {p.tipo==='mesa' ? 'Local' : 'Llevar'}
                  </span>
                  <span className={styles.ocTime}>{formatHora(p.fechaHora)}</span>
                </div>
                <div className={styles.ocClient}>{labelPedido(p)}</div>
                <div className={styles.ocItems}>
                  {(p.detalles ?? []).map(d => `${d.cantidad}× ${d.plato.nombre}`).join(' · ').slice(0,60)}
                </div>
                <div className={styles.ocAmt}>{formatPrecio(p.total)}</div>

                {/* Asignar casillero */}
                <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--adm-muted)', fontFamily:'var(--adm-font-ui)', alignSelf:'center' }}>Casillero:</span>
                  {(['X','Y'] as const).map(cas => (
                    <button key={cas}
                      className={`adm-btn ${p.casillero===cas ? 'adm-btn-primary' : 'adm-btn-ghost'}`}
                      style={{ padding:'6px 14px', fontSize:13 }}
                      onClick={() => handleAsignar(p.id, p.casillero===cas ? null : cas)}
                      disabled={asignando===p.id}
                    >
                      {cas}
                    </button>
                  ))}
                </div>

                <div className={styles.ocFoot}>
                  <span className={styles.ocLocker}>
                    <Icon name="locker" size={16}/>
                    {p.casillero ? <><b>{p.casillero}</b> asignado</> : <span style={{ color:'var(--adm-muted)' }}>Sin asignar</span>}
                  </span>
                  <span style={{ flex:1 }}/>
                  <button className={styles.btnOpen}
                    onClick={() => handleAbrir(p)}
                    disabled={entregando===p.id || !p.casillero}
                    title={!p.casillero ? 'Asigna un casillero primero' : undefined}
                  >
                    <Icon name="key" size={16}/> {entregando===p.id ? 'Abriendo…' : 'Abrir'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Casilleros X e Y */}
          <div>
            <div className="adm-section-row" style={{ margin:'0 0 14px' }}>
              <div>
                <div className="adm-section-title" style={{ fontSize:19 }}>Casilleros</div>
                <div className="adm-section-sub">X e Y · botones de seguridad</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              {(['X','Y'] as const).map(cas => {
                const pedido = cas === 'X' ? casilleroX : casilleroY;
                const libre  = !pedido;
                return (
                  <div key={cas} className={`${styles.locker} ${libre ? styles.lockerFree : styles.lockerOccupied}`}>
                    <div className={styles.lockerNum}>{cas}</div>
                    <div className={styles.lockerState}>
                      <span className={libre ? 'adm-chip adm-chip-ok' : 'adm-chip adm-chip-bad'}>
                        <span className="adm-chip-dot"/>{libre ? 'Libre' : 'Ocupado'}
                      </span>
                    </div>
                    {pedido ? (
                      <>
                        <div className={styles.lockerBody}>
                          <div className={styles.lockerOrder}>Pedido <b>#{pedido.id}</b></div>
                          <div className={styles.lockerClient}>{labelPedido(pedido)}</div>
                          <div className={styles.lockerItems}>{(pedido.detalles??[]).map(d=>`${d.cantidad}× ${d.plato.nombre}`).join(', ')}</div>
                        </div>
                        <div className={styles.lockerAct}>
                          <button className={styles.btnOpen} onClick={() => handleAbrir(pedido)} disabled={entregando===pedido.id}>
                            <Icon name="key" size={16}/> Abrir
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className={styles.lockerBody}>
                        <Icon name="locker" size={26} className={styles.lockerFreeIcon}/>
                        <span className={styles.lockerFreeLabel}>Libre</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* QR panel */}
            <div className={styles.qrPanel}>
              <div className={`${styles.qrNote} ${arduino ? styles.qrNoteOk : styles.qrNoteWarn}`}>
                <Icon name={arduino ? 'checkCircle' : 'alert'} size={18}/>
                <div>
                  {arduino
                    ? 'Arduino conectado — el casillero se abrirá automáticamente al confirmar el QR.'
                    : 'Arduino no conectado — el casillero deberá abrirse manualmente.'}
                </div>
              </div>
              <div className={styles.qrTitle}>Escanea el QR del pedido</div>

              {/* Vista del scanner — siempre ocupa el mismo espacio */}
              <div className={styles.qrView}>
                {/* Montaje de html5-qrcode — siempre en el DOM */}
                <div id="qr-local-inline" className={styles.scannerMount} />

                {/* Capa decorativa idle — cubre el mount cuando no se escanea */}
                {!scanning && (
                  <div className={styles.scannerIdle}>
                    {scanError ? (
                      <div className={styles.scanErrorMsg}>
                        <Icon name="alert" size={26}/>
                        <span>{scanError}</span>
                      </div>
                    ) : (
                      <>
                        <div className={`${styles.corner} ${styles.cornerTL}`}/>
                        <div className={`${styles.corner} ${styles.cornerTR}`}/>
                        <div className={`${styles.corner} ${styles.cornerBL}`}/>
                        <div className={`${styles.corner} ${styles.cornerBR}`}/>
                        <div className={styles.scanLine}/>
                        <Icon name="scan" size={76} className={styles.qrGlyph}/>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Botón debajo de la vista */}
              {scanning ? (
                <button className="adm-btn adm-btn-ghost"
                  style={{ width:'100%', justifyContent:'center', marginTop:14 }}
                  onClick={detenerScan}>
                  ✕ Detener cámara
                </button>
              ) : (
                <button className="adm-btn adm-btn-primary"
                  style={{ width:'100%', justifyContent:'center', marginTop:14 }}
                  onClick={iniciarScan}
                  disabled={pedidos.length === 0}>
                  <Icon name="scan" size={17}/> {scanError ? 'Reintentar' : 'Escanear QR'}
                </button>
              )}

              <div className={styles.qrHint}>
                {scanning
                  ? 'Apunta la cámara al QR del cliente.'
                  : pedidos.length === 0
                    ? 'No hay pedidos listos para entregar.'
                    : 'Toca el botón para activar la cámara y confirmar la entrega.'}
              </div>
            </div>
          </div>
        </div>

        {/* Toasts */}
        <div className="adm-toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`adm-toast ${t.type}`}>
              <Icon name={t.type==='warn' ? 'alert' : 'checkCircle'} size={18}/>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>

    </AdminLayout>
  );
}
