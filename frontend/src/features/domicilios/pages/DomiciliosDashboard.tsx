import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/shared/components/AppShell';
import { fetchPedidosDomiciliario } from '../services/domicilios.service';
import { QrScannerModal } from '../components/QrScannerModal';
import type { ApiPedido } from '@/features/admin/services/admin.service';
import styles from './DomiciliosDashboard.module.css';

// ── SVG Icons ─────────────────────────────────────────────────────────────

const Ic = {
  delivery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="18" r="2.5" /><circle cx="17" cy="18" r="2.5" />
      <path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17.5v.5" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M4 12h16" />
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
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </svg>
  ),
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// ── Status stepper ──────────────────────────────────────────────────────────

type StepIdx = 0 | 1 | 2;

const STEPS = [
  { label: 'Recogido',  icon: Ic.box         },
  { label: 'En camino', icon: Ic.delivery     },
  { label: 'Entregado', icon: Ic.checkCircle  },
];

function estadoAIdx(estado: string): StepIdx {
  if (estado === 'entregado') return 2;
  if (estado === 'en_camino') return 1;
  return 0;
}

function badgeCls(idx: StepIdx) {
  if (idx === 2) return styles.badgeOk;
  if (idx === 1) return styles.badgeWarn;
  return styles.badgeInfo;
}

function badgeLabel(idx: StepIdx) {
  if (idx === 2) return 'Entregado';
  if (idx === 1) return 'En camino';
  return 'Recogiendo';
}

function Stepper({ currentIdx }: { currentIdx: StepIdx }) {
  return (
    <div className={styles.steps}>
      {STEPS.map((s, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div key={i} style={{ display: 'contents' }}>
            <div className={`${styles.step} ${done ? styles.stepDone : ''} ${current ? styles.stepCurrent : ''}`}>
              <div className={styles.stepDot}>
                {done ? Ic.check : s.icon}
              </div>
              <div className={styles.stepL}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`${styles.stepBar} ${done ? styles.stepBarFill : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export function DomiciliosDashboard() {
  const [pedidos,         setPedidos        ] = useState<ApiPedido[]>([]);
  const [loading,         setLoading        ] = useState(true);
  const [connected,       setConnected      ] = useState(false);
  const [scannerPedidoId, setScannerPedidoId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await fetchPedidosDomiciliario();
      setPedidos(data);
      setConnected(true);
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

  function abrirScanner(id?: number) {
    const target = id ?? pedidos.find((p) => p.estado !== 'entregado')?.id;
    if (target != null) setScannerPedidoId(target);
  }

  return (
    <AppShell title="Mis Entregas">
      <div className={styles.wrapper}>

        {/* Sub-header */}
        <div className={styles.subHeader}>
          <p className={styles.info}>
            {loading
              ? 'Conectando…'
              : <><b>{pedidos.length} entrega{pedidos.length !== 1 ? 's' : ''} asignada{pedidos.length !== 1 ? 's' : ''}</b> · se actualiza cada 5 s</>}
          </p>
          <div className={styles.spacer} />
          <button className={styles.btnTopScan} onClick={() => abrirScanner()}>
            {Ic.scan} Escanear QR
          </button>
          <span className={`${styles.connPill} ${!connected ? styles.connPillOff : ''}`}>
            <span className={`${styles.connDot} ${!connected ? styles.connDotOff : ''}`} />
            {connected ? 'Conectado' : 'Sin conexión'}
          </span>
        </div>

        {/* Cards */}
        <div className={styles.stage}>
          {!loading && pedidos.length === 0 ? (
            <div className={styles.empty}>
              {Ic.delivery}
              <h3>Sin entregas asignadas</h3>
              <p>Cuando despachen un pedido a tu nombre aparecerá aquí.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {pedidos.map((pedido) => {
                const idx  = estadoAIdx(pedido.estado ?? '');
                const done = idx === 2;
                return (
                  <div key={pedido.id} className={styles.dcard}>

                    {/* Header */}
                    <div className={styles.dcardTop}>
                      <span className={styles.dcardId}>#{pedido.id}</span>
                      <span className={styles.dcardTime}>{formatHora(pedido.fechaHora)}</span>
                      <span className={`${styles.badge} ${badgeCls(idx)}`}>
                        <span className={styles.bdot} />
                        {badgeLabel(idx)}
                      </span>
                    </div>

                    {/* Stepper */}
                    <Stepper currentIdx={idx} />

                    {/* Body */}
                    <div className={styles.dcardBody}>

                      {pedido.direccionEntrega && (
                        <div className={styles.dblock}>
                          <div className={`${styles.dblockIc} ${styles.dblockPeach}`}>{Ic.pin}</div>
                          <div className={styles.dblockMain}>
                            <div className={styles.dblockK}>Dirección de entrega</div>
                            <div className={styles.dblockV}>{pedido.direccionEntrega}</div>
                          </div>
                        </div>
                      )}

                      {(pedido.detalles ?? []).length > 0 && (
                        <div className={styles.ditems}>
                          {(pedido.detalles ?? []).map((d) => (
                            <div key={d.id} className={styles.ditem}>
                              <span className={styles.qty}>{d.cantidad}×</span>
                              <span className={styles.ditemName}>{d.plato.nombre}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {pedido.cliente?.nombre && (
                        <div className={styles.dblock}>
                          <div className={`${styles.dblockIc} ${styles.dblockAmber}`}>{Ic.alert}</div>
                          <div className={styles.dblockMain}>
                            <div className={styles.dblockK}>Cliente</div>
                            <div className={styles.dblockV}>{pedido.cliente.nombre}</div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Footer — sin precio (pedido prepagado) */}
                    <div className={styles.dcardFoot}>
                      {done ? (
                        <span className={styles.badgeEntregado}>
                          {Ic.checkCircle} Entregado
                        </span>
                      ) : (
                        <button className={styles.btnScan} onClick={() => abrirScanner(pedido.id)}>
                          {Ic.scan} Escanear QR
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {scannerPedidoId != null && (
        <QrScannerModal
          onClose={() => setScannerPedidoId(null)}
          onConfirmado={(id) => {
            setPedidos((prev) => prev.filter((p) => p.id !== id));
            setScannerPedidoId(null);
          }}
        />
      )}
    </AppShell>
  );
}
