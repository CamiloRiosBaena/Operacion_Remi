import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalClose } from '@/shared/hooks/useModalClose';
import { QRCodeCanvas } from 'qrcode.react';
import { AdminLayout } from '../components/AdminLayout';
import {
  fetchMesasAdmin, createMesa, deleteMesa, updateMesaAdmin,
  type ApiMesa, type EstadoMesa,
} from '../services/admin.service';
import styles from './MesasAdmin.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ESTADO_CFG: Record<EstadoMesa, { label: string; color: string; bg: string }> = {
  libre:     { label: 'Libre',     color: '#15803d', bg: '#dcfce7' },
  ocupada:   { label: 'Ocupada',   color: '#b91c1c', bg: '#fee2e2' },
  reservada: { label: 'Reservada', color: '#b45309', bg: '#fef3c7' },
};

function getMenuUrl(mesaId: number): string {
  const base = window.location.origin;
  return `${base}/menu?mesa=${mesaId}`;
}

// ── Componente QR individual ──────────────────────────────────────────────────

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
      <QRCodeCanvas
        id={`qr-mesa-${mesa.id}`}
        value={url}
        size={200}
        marginSize={2}
        level="M"
        ref={canvasRef}
      />
      <p className={styles.qrUrl}>{url}</p>
      <button className={styles.btnDescargar} onClick={handleDescargar}>
        ⬇ Descargar PNG
      </button>
    </div>
  );
}

// ── Modal QR con Portal ───────────────────────────────────────────────────────

function QrModal({ mesa, onClose }: { mesa: ApiMesa; onClose: () => void }) {
  const { backdropProps } = useModalClose(onClose);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.modalOverlay} {...backdropProps}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.qrPanelHeader}>
          <div className={styles.qrPanelInfo}>
            <span className={styles.qrPanelTitle}>
              Código QR — Mesa {mesa.numero}
            </span>
            <span className={styles.qrPanelSub}>
              Escanea para acceder al menú de esta mesa
            </span>
          </div>
          <button className={styles.btnCerrarQr} onClick={onClose}>
            ✕ Cerrar
          </button>
        </div>
        <MesaQR mesa={mesa} />
      </div>
    </div>,
    document.body
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function MesasAdmin() {
  const [mesas,     setMesas    ] = useState<ApiMesa[]>([]);
  const [loading,   setLoading  ] = useState(true);
  const [nuevaNum,  setNuevaNum ] = useState('');
  const [creando,   setCreando  ] = useState(false);
  const [errorMsg,  setErrorMsg ] = useState('');
  const [qrAbierto, setQrAbierto] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMesasAdmin();
      setMesas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCrear() {
    const num = parseInt(nuevaNum);
    if (isNaN(num) || num < 1) return;
    setCreando(true);
    setErrorMsg('');
    try {
      const nueva = await createMesa(num);
      setMesas((prev) => [...prev, nueva].sort((a, b) => a.numero - b.numero));
      setNuevaNum('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear la mesa');
    } finally {
      setCreando(false);
    }
  }

  async function handleEliminar(mesa: ApiMesa) {
    if (!confirm(`¿Eliminar Mesa ${mesa.numero}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteMesa(mesa.id);
      setMesas((prev) => prev.filter((m) => m.id !== mesa.id));
      if (qrAbierto === mesa.id) setQrAbierto(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  async function handleCambiarEstado(mesa: ApiMesa, estado: EstadoMesa) {
    try {
      const actualizada = await updateMesaAdmin(mesa.id, { estado });
      setMesas((prev) => prev.map((m) => (m.id === mesa.id ? actualizada : m)));
    } catch (err) {
      console.error(err);
    }
  }

  const mesaActiva = qrAbierto !== null ? mesas.find((m) => m.id === qrAbierto) : null;
  const libres     = mesas.filter((m) => m.estado === 'libre').length;
  const ocupadas   = mesas.filter((m) => m.estado === 'ocupada').length;

  return (
    <AdminLayout title="Mesas">
      <div className={styles.wrapper}>

        {/* ── Resumen ── */}
        <div className={styles.resumen}>
          <div className={styles.resumenCard}>
            <span className={styles.resumenNum}>{mesas.length}</span>
            <span className={styles.resumenLabel}>Total</span>
          </div>
          <div className={styles.resumenCard}>
            <span className={styles.resumenNum} style={{ color: '#15803d' }}>{libres}</span>
            <span className={styles.resumenLabel}>Libres</span>
          </div>
          <div className={styles.resumenCard}>
            <span className={styles.resumenNum} style={{ color: '#b91c1c' }}>{ocupadas}</span>
            <span className={styles.resumenLabel}>Ocupadas</span>
          </div>
        </div>

        {/* ── Crear mesa ── */}
        <div className={styles.crearWrap}>
          <h3 className={styles.crearTitle}>Agregar mesa</h3>
          <div className={styles.crearRow}>
            <input
              type="number"
              className={styles.input}
              placeholder="Número de mesa (ej: 5)"
              value={nuevaNum}
              onChange={(e) => setNuevaNum(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
              min={1}
            />
            <button
              className={styles.btnCrear}
              onClick={handleCrear}
              disabled={creando || !nuevaNum}
            >
              {creando ? 'Creando…' : '+ Agregar mesa'}
            </button>
          </div>
          {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
        </div>

        {/* ── Grid de mesas ── */}
        {loading ? (
          <p className={styles.cargando}>Cargando mesas…</p>
        ) : mesas.length === 0 ? (
          <p className={styles.vacio}>No hay mesas registradas. Agrega la primera.</p>
        ) : (
          <div className={styles.grid}>
            {mesas.map((mesa) => {
              const cfg = ESTADO_CFG[mesa.estado];
              return (
                <div key={mesa.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <span className={styles.mesaNum}>Mesa {mesa.numero}</span>
                      <span
                        className={styles.estadoBadge}
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleEliminar(mesa)}
                      title="Eliminar mesa"
                    >
                      🗑
                    </button>
                  </div>

                  <div className={styles.estadoRow}>
                    <span className={styles.estadoLabel}>Estado:</span>
                    <select
                      className={styles.estadoSelect}
                      value={mesa.estado}
                      onChange={(e) => handleCambiarEstado(mesa, e.target.value as EstadoMesa)}
                    >
                      <option value="libre">Libre</option>
                      <option value="ocupada">Ocupada</option>
                      <option value="reservada">Reservada</option>
                    </select>
                  </div>

                  <button
                    className={styles.btnQr}
                    onClick={() => setQrAbierto(mesa.id)}
                  >
                    ▼ Ver / Descargar QR
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className={styles.count}>
          {mesas.length} mesa{mesas.length !== 1 ? 's' : ''} registrada{mesas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Modal QR — montado en document.body via Portal ── */}
      {mesaActiva && (
        <QrModal mesa={mesaActiva} onClose={() => setQrAbierto(null)} />
      )}
    </AdminLayout>
  );
}
