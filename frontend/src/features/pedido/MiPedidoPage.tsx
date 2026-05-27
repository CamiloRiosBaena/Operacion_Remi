import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fetchQrTokenPublico } from '@/features/pedidos/services/pedidos.service';
import styles from './MiPedidoPage.module.css';

type Estado = 'cargando' | 'listo' | 'error';

export function MiPedidoPage() {
  const { id } = useParams<{ id: string }>();
  const pedidoId = Number(id);

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [estado, setEstado]   = useState<Estado>('cargando');
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!pedidoId) { setEstado('error'); setError('ID de pedido inválido.'); return; }
    fetchQrTokenPublico(pedidoId)
      .then(({ token }) => { setQrToken(token); setEstado('listo'); })
      .catch((e: Error) => { setEstado('error'); setError(e.message); });
  }, [pedidoId]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <span className={styles.logo}>📦</span>
          <div>
            <h1 className={styles.titulo}>Mi pedido #{pedidoId}</h1>
            <p className={styles.sub}>Muestra este QR cuando te entreguen el pedido</p>
          </div>
        </div>

        {estado === 'cargando' && <p className={styles.info}>Cargando QR…</p>}

        {estado === 'error' && (
          <div className={styles.errorBox}>
            <p className={styles.errorMsg}>{error || 'No se pudo obtener el QR.'}</p>
          </div>
        )}

        {estado === 'listo' && qrToken && (
          <div className={styles.qrBox}>
            <QRCodeSVG
              value={`${window.location.origin}/confirmar-entrega?token=${qrToken}`}
              size={220}
              level="M"
            />
            <p className={styles.qrHint}>Válido por 4 horas</p>
          </div>
        )}
      </div>
    </div>
  );
}
