import { useLayoutEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { infoPedidoPorToken, confirmarEntregaConToken, type ApiPedido } from '@/features/admin/services/admin.service';
import styles from './QrScannerModal.module.css';

interface Props {
  onClose: () => void;
  onConfirmado: (pedidoId: number) => void;
}

function formatPrecio(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

type Fase = 'escaneando' | 'preview' | 'confirmando' | 'exito' | 'error';

const SCANNER_ID = 'qr-reader';

function extraerToken(texto: string): string | null {
  try {
    const url = new URL(texto);
    return url.searchParams.get('token');
  } catch {
    return texto.trim() || null;
  }
}

async function iniciarEscaner(
  onExito: (texto: string) => void,
  onError: (msg: string) => void,
): Promise<Html5Qrcode> {
  const scanner = new Html5Qrcode(SCANNER_ID);
  const config  = { fps: 10, qrbox: { width: 220, height: 220 } };
  const onDecode = (texto: string) => { onExito(texto); };

  // Intentar cámara trasera (móvil); si falla, usar cámara frontal/webcam (desktop)
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

export function QrScannerModal({ onClose, onConfirmado }: Props) {
  const [fase, setFase]       = useState<Fase>('escaneando');
  const [pedido, setPedido]   = useState<ApiPedido | null>(null);
  const [token, setToken]     = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // Incrementar scanKey limpia el div y reinicia el efecto
  const [scanKey, setScanKey] = useState(0);

  useLayoutEffect(() => {
    if (fase !== 'escaneando') return;

    let scanner: Html5Qrcode | null = null;
    let detenido = false;

    // Garantiza que stop() se llame solo una vez
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
      // Si el cleanup corrió antes de que la promesa resolviera, parar ya
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
      setFase('exito');
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>Escanear QR del cliente</h2>
          <button className={styles.btnCerrar} onClick={onClose}>✕</button>
        </div>

        {fase === 'escaneando' && (
          <>
            {/* key={scanKey} desmonta y remonta el div limpiando el HTML de html5-qrcode */}
            <div key={scanKey} id={SCANNER_ID} className={styles.visor} />
            <p className={styles.hint}>Apunta la cámara al QR del cliente</p>
          </>
        )}

        {fase === 'preview' && pedido && (
          <div className={styles.preview}>
            <p className={styles.previewTitulo}>Pedido #{pedido.id}</p>
            {pedido.cliente && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Cliente</span>
                <span className={styles.infoValor}>{pedido.cliente.nombre}</span>
              </div>
            )}
            {pedido.direccionEntrega && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dirección</span>
                <span className={styles.infoValor}>{pedido.direccionEntrega}</span>
              </div>
            )}
            <ul className={styles.items}>
              {(pedido.detalles ?? []).map((d) => (
                <li key={d.id} className={styles.item}>
                  <span className={styles.itemCant}>{d.cantidad}×</span>
                  <span className={styles.itemNombre}>{d.plato.nombre}</span>
                  <span className={styles.itemSub}>{formatPrecio(d.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={styles.total}>{formatPrecio(pedido.total)}</span>
            </div>
            <button className={styles.btnConfirmar} onClick={handleConfirmar}>
              ✓ Confirmar entrega
            </button>
          </div>
        )}

        {fase === 'confirmando' && <p className={styles.hint}>Confirmando entrega…</p>}

        {fase === 'exito' && (
          <div className={styles.exito}>
            <span className={styles.exitoIcon}>✓</span>
            <p className={styles.exitoMsg}>¡Entrega confirmada!</p>
            <button className={styles.btnCerrar2} onClick={onClose}>Cerrar</button>
          </div>
        )}

        {fase === 'error' && (
          <div className={styles.errorBox}>
            <p className={styles.errorMsg}>{errorMsg}</p>
            <button className={styles.btnReintentar} onClick={reintentar}>Reintentar</button>
          </div>
        )}
      </div>
    </div>
  );
}
