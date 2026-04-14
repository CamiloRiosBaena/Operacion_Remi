import { AppShell } from '@/shared/components/AppShell';
import styles from './CocinaDashboard.module.css';

// Pedidos de ejemplo hasta conectar el WebSocket
const MOCK_PEDIDOS = [
  {
    id: 'P-001',
    mesa: 'Mesa 3',
    estado: 'recibido' as const,
    items: ['Bandeja paisa x1', 'Jugo de lulo x1'],
    hora: '12:34',
  },
  {
    id: 'P-002',
    mesa: 'Mesa 7',
    estado: 'preparando' as const,
    items: ['Ajiaco x2', 'Agua x2'],
    hora: '12:28',
  },
];

const ESTADO_LABEL = {
  recibido: 'Recibido',
  preparando: 'En preparación',
  listo: 'Listo',
};

const ESTADO_COLOR = {
  recibido: '#3b82f6',
  preparando: '#d97706',
  listo: '#16a34a',
};

export function CocinaDashboard() {
  return (
    <AppShell title="KDS — Cocina">
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <p className={styles.info}>
            Vista en tiempo real de las comandas. Conectando al servidor…
          </p>
          <span className={styles.badge}>🔴 Sin conexión (demo)</span>
        </div>

        <div className={styles.grid}>
          {MOCK_PEDIDOS.map((pedido) => (
            <div key={pedido.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.pedidoId}>{pedido.id}</span>
                <span className={styles.mesa}>{pedido.mesa}</span>
                <span className={styles.hora}>{pedido.hora}</span>
              </div>

              <ul className={styles.items}>
                {pedido.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className={styles.cardFooter}>
                <span
                  className={styles.estado}
                  style={{ background: `${ESTADO_COLOR[pedido.estado]}18`, color: ESTADO_COLOR[pedido.estado] }}
                >
                  {ESTADO_LABEL[pedido.estado]}
                </span>

                <button className={styles.btnAccion}>
                  {pedido.estado === 'recibido' ? 'Comenzar' : 'Marcar listo'}
                </button>
              </div>
            </div>
          ))}

          <div className={styles.emptyCard}>
            <span>🍳</span>
            <p>Aquí aparecerán las nuevas comandas</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
