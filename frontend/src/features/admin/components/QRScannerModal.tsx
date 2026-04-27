import { useLayoutEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { infoPedidoPorToken, confirmarEntregaConToken, type ApiPedido } from '@/features/admin/services/admin.service';
import styles from './QRScannerModal.module.css';
import adminStyles from '../pages/PedidosAdmin.module.css';

interface Props {
  pedidoId: number;
  onConfirmado: (pedidoId: number) => void;
  onClose: () => void;
}

type Fase = 'escaneando' | 'preview' | 'confirmando' | 'ok' | 'error';

const SCANNER_ID = 'qr-admin-reader';

function extraerToken(texto: string): string | null {
  try {
    const url = new URL(texto);
    return url.searchParams.get('token');
  } catch {
    return texto.trim() || null;
  }
}

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

async function iniciarEscaner(
  onExito: (texto: string) => void,
  onError: (msg: string) => void,
): Promise<Html5Qrcode> {
  const scanner = new Html5Qrcode(SCANNER_ID);
  const config  = { fps: 10, qrbox: { width: 230, height: 230 } };
  const onDecode = (texto: string) => { onExito(texto); };

  try {
    await scanner.start({ facingMode: 'environment' }, config, onDecode, () => {});
  } catch {
    try {
      await scanner.start({ facingMode: 'user' }, config, onDecode, () => {});
    } catch {
      onError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }
  return scanner;
}

export function QRScannerModal({ pedidoId, onConfirmado, onClose }: Props) {
  const [fase, setFase]         = useState<Fase>('escaneando');
  const [pedido, setPedido]     = useState<ApiPedido | null>(null);
  const [token, setToken]       = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanKey, setScanKey]   = useState(0);

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
        setToken(tok);
        try {
          const p = await infoPedidoPorToken(tok);
          setPedido(p);
          setFase('preview');
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

  async function handleConfirmar() {
    if (!token || !pedido) return;
    setFase('confirmando');
    try {
      await confirmarEntregaConToken(token);
      setFase('ok');
      onConfirmado(pedido.id);
    } catch (e: unknown) {
      setFase('error');
      setErrorMsg(e instanceof Error ? e.message : 'Error al confirmar la entrega.');
    }
  }

  function reintentar() {
    setPedido(null);
    setToken('');
    setErrorMsg('');
    setFase('escaneando');
    setScanKey((k) => k + 1);
  }

  return (
    <div className={adminStyles.modalOverlay} onClick={onClose}>
      <div className={adminStyles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={adminStyles.modalTitle}>
          {fase === 'escaneando' ? `Escanear QR — Pedido #${pedidoId}` : `Pedido #${pedido?.id ?? pedidoId}`}
        </h3>

        {fase === 'escaneando' && (
          <>
            <p className={styles.hint}>Apunta la cámara al QR del cliente</p>
            <div key={scanKey} id={SCANNER_ID} className={styles.scannerBox} />
          </>
        )}

        {fase === 'preview' && pedido && (
          <div className={styles.preview}>
            {pedido.cliente && (
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>Cliente</span>
                <span>{pedido.cliente.nombre}</span>
              </div>
            )}
            <ul className={adminStyles.detalleList}>
              {(pedido.detalles ?? []).map((d) => (
                <li key={d.id} className={adminStyles.detalleItem}>
                  <span className={adminStyles.detalleNombre}>{d.plato.nombre}</span>
                  <span className={adminStyles.detalleCantidad}>×{d.cantidad}</span>
                  <span className={adminStyles.detalleSubtotal}>{formatPrecio(d.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className={adminStyles.detalleTotalRow}>
              <span>Total</span>
              <span className={adminStyles.detalleTotal}>{formatPrecio(pedido.total)}</span>
            </div>
            <button
              className={adminStyles.btnCerrarModal}
              style={{ alignSelf: 'stretch', background: '#16a34a' }}
              onClick={handleConfirmar}
            >
              ✓ Confirmar entrega
            </button>
          </div>
        )}

        {fase === 'confirmando' && <p className={styles.hint}>Confirmando entrega…</p>}

        {fase === 'ok' && (
          <div className={styles.okBox}>
            <svg viewBox="0 0 52 52" fill="none" width="48" height="48">
              <circle cx="26" cy="26" r="26" fill="#22c55e" />
              <path d="M14 26l8 8 16-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className={styles.okText}>¡Entrega confirmada!</p>
          </div>
        )}

        {fase === 'error' && (
          <div className={styles.okBox}>
            <p className={styles.errorText}>{errorMsg}</p>
            <button className={adminStyles.btnCerrarModal} onClick={reintentar}>
              Reintentar
            </button>
          </div>
        )}

        <button className={adminStyles.btnCerrarModal} onClick={onClose}>
          {fase === 'ok' ? 'Cerrar' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
