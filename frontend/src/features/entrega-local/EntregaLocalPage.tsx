import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AppShell } from '@/shared/components/AppShell';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  fetchPedidos,
  infoPedidoPorToken,
  confirmarEntregaConToken,
  asignarCasillero,
  type ApiPedido,
} from '@/features/admin/services/admin.service';
import styles from './EntregaLocalPage.module.css';

// ── Tipos mínimos para Web Serial API ────────────────────────────────────────

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}

declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function labelPedido(p: ApiPedido) {
  if (p.tipo === 'mesa' && p.mesa) return `Mesa ${p.mesa.numero}`;
  if (p.cliente) return p.cliente.nombre;
  return 'Invitado';
}

function extraerToken(texto: string): string | null {
  try {
    const url = new URL(texto);
    return url.searchParams.get('token');
  } catch {
    return texto.trim() || null;
  }
}

const SCANNER_ID = 'qr-entrega-local-reader';
type Fase = 'escaneando' | 'confirmando' | 'exito' | 'error';
type Casillero = 'X' | 'Y';

async function iniciarEscaner(
  onExito: (texto: string) => void,
  onError: (msg: string) => void,
): Promise<Html5Qrcode> {
  const scanner = new Html5Qrcode(SCANNER_ID);
  const config = { fps: 10, qrbox: { width: 220, height: 220 } };
  try {
    await scanner.start({ facingMode: 'environment' }, config, onExito, () => {});
  } catch {
    try {
      await scanner.start({ facingMode: 'user' }, config, onExito, () => {});
    } catch {
      onError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }
  return scanner;
}

// ── Componente principal ───────────────────────────────────────────────────────

export function EntregaLocalPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  // Lista de pedidos listos (mesa / llevar)
  const [pedidos, setPedidos]         = useState<ApiPedido[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Arduino serial
  const serialPortRef                       = useRef<SerialPort | null>(null);
  const [serialConectado, setSerialConectado] = useState(false);
  const [serialError, setSerialError]       = useState('');

  // Asignación de casillero en curso
  const [asignando, setAsignando] = useState<number | null>(null);

  // Estado del escáner QR
  const [fase, setFase]         = useState<Fase>('escaneando');
  const [pedido, setPedido]     = useState<ApiPedido | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanKey, setScanKey]   = useState(0);

  // ── Carga de pedidos ─────────────────────────────────────────────────────

  const cargarPedidos = useCallback(async () => {
    try {
      const todos = await fetchPedidos();
      setPedidos(
        todos.filter((p) => p.estado === 'listo' && (p.tipo === 'mesa' || p.tipo === 'llevar')),
      );
    } catch { /* silencia errores de polling */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => {
    cargarPedidos();
    intervalRef.current = setInterval(cargarPedidos, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cargarPedidos]);

  // Cierra el puerto serial al desmontar (logout/navegación) para que se pueda reconectar
  useEffect(() => {
    return () => {
      serialPortRef.current?.close().catch(() => {});
      serialPortRef.current = null;
    };
  }, []);

  // ── Arduino: conexión serial ─────────────────────────────────────────────

  async function conectarArduino() {
    if (!navigator.serial) {
      setSerialError('Tu navegador no soporta Web Serial API. Usa Chrome o Edge.');
      return;
    }
    try {
      setSerialError('');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      serialPortRef.current = port;
      setSerialConectado(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'NotFoundError') {
        setSerialError('No se pudo conectar al Arduino: ' + e.message);
      }
    }
  }

  async function desconectarArduino() {
    try {
      await serialPortRef.current?.close();
    } catch { /* ignorar */ }
    serialPortRef.current = null;
    setSerialConectado(false);
  }

  async function enviarComando(casillero: Casillero): Promise<void> {
    const port = serialPortRef.current;
    if (!port?.writable) throw new Error('Arduino no conectado');
    const writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode(casillero + '\n'));
    writer.releaseLock();
  }

  // Botón de emergencia: abre un casillero directamente sin QR
  async function abrirEmergencia(casillero: Casillero) {
    if (!serialConectado) { alert('Conecta el Arduino primero.'); return; }
    try {
      await enviarComando(casillero);
    } catch (e: unknown) {
      alert('Error al enviar comando: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ── Asignación de casillero a un pedido ──────────────────────────────────

  async function handleAsignar(pedidoId: number, casillero: 'X' | 'Y' | null) {
    setAsignando(pedidoId);
    try {
      const actualizado = await asignarCasillero(pedidoId, casillero);
      setPedidos((prev) =>
        prev.map((p) => p.id === pedidoId ? { ...p, casillero: actualizado.casillero } : p),
      );
    } catch (e: unknown) {
      alert('Error al asignar casillero: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setAsignando(null);
    }
  }

  // ── Escáner QR ──────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (fase !== 'escaneando') return;

    let scanner: Html5Qrcode | null = null;
    let detenido = false;

    const detener = () => {
      if (detenido) return;
      detenido = true;
      scanner?.stop().catch(() => {});
    };

    iniciarEscaner(
      async (texto) => {
        detener();
        const tok = extraerToken(texto);
        if (!tok) { setFase('error'); setErrorMsg('El QR escaneado no es válido.'); return; }
        setFase('confirmando');
        try {
          const p = await infoPedidoPorToken(tok);
          if (p.tipo !== 'mesa' && p.tipo !== 'llevar') {
            setFase('error');
            setErrorMsg('Este QR es de un domicilio. Usa el panel de domicilios.');
            return;
          }
          if (!p.casillero) {
            setFase('error');
            setErrorMsg('Este pedido no tiene casillero asignado. Asígnalo desde el panel izquierdo.');
            return;
          }
          // Abrir casillero (usa ref directo, no el state capturado en el closure)
          if (serialPortRef.current) {
            try { await enviarComando(p.casillero as Casillero); } catch { /* no bloquear si falla serial */ }
          }
          // Marcar como entregado
          await confirmarEntregaConToken(tok);
          setPedido(p);
          setPedidos((prev) => prev.filter((x) => x.id !== p.id));
          setFase('exito');
        } catch (e: unknown) {
          setFase('error');
          setErrorMsg(e instanceof Error ? e.message : 'QR no válido o expirado.');
        }
      },
      (msg) => { setFase('error'); setErrorMsg(msg); },
    ).then((s) => {
      scanner = s;
      if (detenido) scanner.stop().catch(() => {});
    });

    return () => { detener(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanKey]);

  function reintentar() {
    setPedido(null);
    setErrorMsg('');
    setFase('escaneando');
    setScanKey((k) => k + 1);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Entrega en Local">

      {/* ── Barra superior: Arduino (solo admin) ── */}
      {isAdmin && (
        <div className={styles.arduinoBar}>
          <div className={styles.arduinoStatus}>
            <span className={`${styles.dot} ${serialConectado ? styles.dotConectado : styles.dotDesconectado}`} />
            <span>{serialConectado ? 'Arduino conectado' : 'Arduino desconectado'}</span>
          </div>

          {serialConectado ? (
            <div className={styles.arduinoActions}>
              <button className={styles.btnEmergencia} onClick={() => abrirEmergencia('X')} title="Abrir casillero X sin QR">
                🔓 Emergencia X
              </button>
              <button className={styles.btnEmergencia} onClick={() => abrirEmergencia('Y')} title="Abrir casillero Y sin QR">
                🔓 Emergencia Y
              </button>
              <button className={styles.btnDesconectar} onClick={desconectarArduino}>
                Desconectar
              </button>
            </div>
          ) : (
            <button className={styles.btnConectar} onClick={conectarArduino}>
              🔌 Conectar Arduino
            </button>
          )}

          {serialError && <p className={styles.serialError}>{serialError}</p>}
        </div>
      )}

      <div className={styles.layout}>

        {/* ── Panel izquierdo: pedidos listos ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Listos para entregar</h2>
            <span className={styles.badge}>{pedidos.length}</span>
          </div>

          {loadingList ? (
            <p className={styles.hint}>Cargando…</p>
          ) : pedidos.length === 0 ? (
            <p className={styles.emptyMsg}>Sin pedidos listos</p>
          ) : (
            <ul className={styles.pedidosList}>
              {pedidos.map((p) => {
                const enAsignacion = asignando === p.id;
                return (
                  <li key={p.id} className={styles.pedidoItem}>
                    <div className={styles.pedidoTop}>
                      <span className={styles.pedidoId}>#{p.id}</span>
                      <span className={`${styles.tipoBadge} ${p.tipo === 'mesa' ? styles.tipoMesa : styles.tipoLlevar}`}>
                        {p.tipo === 'mesa' ? '🪑 Mesa' : '🥡 Llevar'}
                      </span>
                      <span className={styles.pedidoHora}>{formatHora(p.fechaHora)}</span>
                    </div>

                    <div className={styles.pedidoCliente}>{labelPedido(p)}</div>

                    <div className={styles.pedidoItems}>
                      {(p.detalles ?? []).map((d) => (
                        <span key={d.id} className={styles.pedidoDetalle}>
                          {d.cantidad}× {d.plato.nombre}
                        </span>
                      ))}
                    </div>

                    <div className={styles.pedidoTotal}>{formatPrecio(p.total)}</div>

                    {/* Casillero */}
                    <div className={styles.casilleroRow}>
                      <span className={styles.casilleroLabel}>Casillero:</span>
                      {isAdmin ? (
                        <>
                          <button
                            className={`${styles.btnCasillero} ${p.casillero === 'X' ? styles.casilleroActivo : ''}`}
                            onClick={() => handleAsignar(p.id, p.casillero === 'X' ? null : 'X')}
                            disabled={enAsignacion}
                            title="Asignar casillero X"
                          >
                            X
                          </button>
                          <button
                            className={`${styles.btnCasillero} ${p.casillero === 'Y' ? styles.casilleroActivo : ''}`}
                            onClick={() => handleAsignar(p.id, p.casillero === 'Y' ? null : 'Y')}
                            disabled={enAsignacion}
                            title="Asignar casillero Y"
                          >
                            Y
                          </button>
                        </>
                      ) : null}
                      {p.casillero ? (
                        <span className={styles.casilleroAsignado}>
                          <strong>{p.casillero}</strong>
                        </span>
                      ) : (
                        <span className={styles.casilleroLabel}>—</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* ── Panel derecho: escáner QR ── */}
        <section className={styles.scanSection}>
          <div className={styles.scanCard}>

            {isAdmin && !serialConectado && (
              <div className={styles.advertenciaSerial}>
                ⚠️ Arduino no conectado — el casillero no se abrirá automáticamente al confirmar.
              </div>
            )}

            <h2 className={styles.scanTitle}>
              {fase === 'escaneando'  && 'Escanea tu QR'}
              {fase === 'confirmando' && 'Abriendo casillero…'}
              {fase === 'exito'       && '¡Casillero abierto!'}
              {fase === 'error'       && 'Error'}
            </h2>

            {fase === 'escaneando' && (
              <>
                <div key={scanKey} id={SCANNER_ID} className={styles.visor} />
                <p className={styles.scanHint}>Apunta la cámara al QR de tu pedido</p>
              </>
            )}

            {fase === 'confirmando' && (
              <div className={styles.procesandoBox}>
                <div className={styles.spinner} />
                <p className={styles.scanHint}>Enviando comando al Arduino…</p>
              </div>
            )}

            {fase === 'exito' && (
              <div className={styles.exitoBox}>
                <svg viewBox="0 0 52 52" fill="none" width="60" height="60">
                  <circle cx="26" cy="26" r="26" fill="#22c55e" />
                  <path d="M14 26l8 8 16-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className={styles.exitoMsg}>¡Retira tu pedido!</p>
                <p className={styles.exitoSub}>
                  Casillero <strong>{pedido?.casillero}</strong> abierto.{' '}
                  {pedido?.cliente?.nombre ?? (pedido?.mesa ? `Mesa ${pedido.mesa.numero}` : '')}
                </p>
                <button className={styles.btnNuevo} onClick={reintentar}>
                  Listo
                </button>
              </div>
            )}

            {fase === 'error' && (
              <div className={styles.errorBox}>
                <p className={styles.errorMsg}>{errorMsg}</p>
                <button className={styles.btnReintentar} onClick={reintentar}>
                  Reintentar
                </button>
              </div>
            )}

          </div>
        </section>

      </div>
    </AppShell>
  );
}
