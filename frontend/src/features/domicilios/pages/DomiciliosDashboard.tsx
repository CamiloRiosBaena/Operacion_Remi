import { AppShell } from '@/shared/components/AppShell';
import styles from './DomiciliosDashboard.module.css';

const MOCK_ENTREGAS = [
  {
    id: 'P-010',
    cliente: 'María López',
    direccion: 'Calle 45 # 12-30, Apto 201',
    items: ['Pollo asado x1', 'Arroz x1', 'Gaseosa x2'],
    estado: 'asignado' as const,
    hora: '13:10',
  },
  {
    id: 'P-011',
    cliente: 'Carlos Ruiz',
    direccion: 'Carrera 8 # 22-15',
    items: ['Hamburguesa x2', 'Papas x2'],
    estado: 'en_camino' as const,
    hora: '12:55',
  },
];

const ESTADO_LABEL = {
  asignado: 'Asignado',
  en_camino: 'En camino',
  entregado: 'Entregado',
};

const ESTADO_COLOR = {
  asignado: '#3b82f6',
  en_camino: '#d97706',
  entregado: '#16a34a',
};

export function DomiciliosDashboard() {
  return (
    <AppShell title="Mis Entregas">
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <p className={styles.info}>Tus pedidos asignados para hoy.</p>
          <span className={styles.counter}>{MOCK_ENTREGAS.length} pedidos</span>
        </div>

        <div className={styles.list}>
          {MOCK_ENTREGAS.map((entrega) => (
            <div key={entrega.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardId}>
                  <span className={styles.pedidoId}>{entrega.id}</span>
                  <span className={styles.hora}>{entrega.hora}</span>
                </div>
                <span
                  className={styles.estado}
                  style={{
                    background: `${ESTADO_COLOR[entrega.estado]}18`,
                    color: ESTADO_COLOR[entrega.estado],
                  }}
                >
                  {ESTADO_LABEL[entrega.estado]}
                </span>
              </div>

              <div className={styles.clienteInfo}>
                <span className={styles.clienteNombre}>👤 {entrega.cliente}</span>
                <span className={styles.clienteDir}>📍 {entrega.direccion}</span>
              </div>

              <ul className={styles.items}>
                {entrega.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className={styles.actions}>
                <button className={styles.btnQR}>📷 Escanear QR</button>
                <button className={styles.btnEstado}>
                  {entrega.estado === 'asignado' ? 'Salir a entregar' : 'Confirmar entrega'}
                </button>
              </div>
            </div>
          ))}

          {MOCK_ENTREGAS.length === 0 && (
            <div className={styles.empty}>
              <span>🛵</span>
              <p>No tienes entregas asignadas por ahora.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
