import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import styles from './PersonalizedSection.module.css';

// Mock — se reemplaza con llamada a la API de historial del cliente
const HISTORIAL_MOCK = [
  { platoId: 1, nombre: 'Bandeja Paisa', precio: 28000, emoji: '🫘', veces: 3 },
  { platoId: 3, nombre: 'Empanadas (x3)', precio: 9000, emoji: '🥟', veces: 2 },
  { platoId: 4, nombre: 'Jugo de Lulo', precio: 5000, emoji: '🥤', veces: 5 },
];

const SUGERIDOS_MOCK = [
  { platoId: 2, nombre: 'Ajiaco Bogotano', precio: 22000, emoji: '🍲' },
  { platoId: 4, nombre: 'Jugo de Lulo', precio: 5000, emoji: '🥤' },
];

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function PersonalizedSection() {
  const { user } = useAuth();
  const { addItem } = useCarrito();

  if (!user || user.rol !== 'cliente') return null;

  return (
    <section className={styles.section}>
      {/* Saludo personalizado */}
      <div className={styles.saludo}>
        <span className={styles.saludoEmoji}>👋</span>
        <div>
          <p className={styles.saludoNombre}>Hola, {user.nombre.split(' ')[0]}</p>
          <p className={styles.saludoText}>Basado en tus pedidos anteriores</p>
        </div>
      </div>

      {/* Vuelve a pedir */}
      <div className={styles.block}>
        <h3 className={styles.blockTitle}>🔁 Vuelve a pedir</h3>
        <div className={styles.horizontalScroll}>
          {HISTORIAL_MOCK.map((plato) => (
            <div key={plato.platoId} className={styles.miniCard}>
              <span className={styles.miniEmoji}>{plato.emoji}</span>
              <p className={styles.miniNombre}>{plato.nombre}</p>
              <p className={styles.miniMeta}>Pedido {plato.veces}x</p>
              <div className={styles.miniFooter}>
                <span className={styles.miniPrecio}>{formatPrecio(plato.precio)}</span>
                <button
                  className={styles.btnMiniAdd}
                  onClick={() =>
                    addItem({
                      platoId: plato.platoId,
                      nombre: plato.nombre,
                      precio: plato.precio,
                      emoji: plato.emoji,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sugeridos */}
      <div className={styles.block}>
        <h3 className={styles.blockTitle}>✨ Puede que te guste</h3>
        <div className={styles.horizontalScroll}>
          {SUGERIDOS_MOCK.map((plato) => (
            <div key={plato.platoId} className={`${styles.miniCard} ${styles.miniCardSugerido}`}>
              <span className={styles.miniEmoji}>{plato.emoji}</span>
              <p className={styles.miniNombre}>{plato.nombre}</p>
              <div className={styles.miniFooter}>
                <span className={styles.miniPrecio}>{formatPrecio(plato.precio)}</span>
                <button
                  className={styles.btnMiniAdd}
                  onClick={() =>
                    addItem({
                      platoId: plato.platoId,
                      nombre: plato.nombre,
                      precio: plato.precio,
                      emoji: plato.emoji,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.divider} />
    </section>
  );
}
