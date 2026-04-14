import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { CartDrawer } from '@/features/carrito/components/CartDrawer';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { PlatoModal } from '../components/PlatoModal';
import styles from './MenuPage.module.css';

export type Plato = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  emoji: string;
  ingredientes: string[];
  extras: { nombre: string; precio: number }[];
};

export const PLATOS: Plato[] = [
  {
    id: 1,
    nombre: 'Bandeja Paisa',
    descripcion: 'El plato emblema de Colombia. Frijoles rojos, arroz, carne molida, chicharrón crujiente, huevo frito, aguacate cremoso y arepa. Contundente y tradicional.',
    precio: 28000,
    categoria: 'Platos fuertes',
    disponible: true,
    emoji: '🫘',
    ingredientes: ['Frijoles rojos', 'Arroz', 'Carne molida', 'Chicharrón', 'Huevo frito', 'Aguacate', 'Arepa'],
    extras: [
      { nombre: 'Extra chicharrón', precio: 3000 },
      { nombre: 'Extra aguacate',   precio: 2000 },
      { nombre: 'Salsa hogao',       precio: 1000 },
    ],
  },
  {
    id: 2,
    nombre: 'Ajiaco Bogotano',
    descripcion: 'Sopa espesa y reconfortante con pollo desmenuzado, tres tipos de papa, mazorca y guascas. Servida con crema de leche y alcaparras al lado.',
    precio: 22000,
    categoria: 'Platos fuertes',
    disponible: true,
    emoji: '🍲',
    ingredientes: ['Pollo', 'Papa criolla', 'Papa pastusa', 'Mazorca', 'Guascas', 'Crema de leche', 'Alcaparras'],
    extras: [
      { nombre: 'Extra pollo',  precio: 4000 },
      { nombre: 'Extra crema',  precio: 1000 },
    ],
  },
  {
    id: 3,
    nombre: 'Empanadas (x3)',
    descripcion: 'Tres empanadas de pipián fritas y doradas al momento. Rellenas de papa con maní y ají amarillo. Crujientes por fuera, suaves por dentro. Vienen con ají casero.',
    precio: 9000,
    categoria: 'Entradas',
    disponible: true,
    emoji: '🥟',
    ingredientes: ['Masa de maíz', 'Papa', 'Maní', 'Ají amarillo', 'Cebolla'],
    extras: [
      { nombre: 'Ají extra',       precio: 500  },
      { nombre: 'Empanada extra',  precio: 3000 },
    ],
  },
  {
    id: 4,
    nombre: 'Jugo de Lulo',
    descripcion: 'Jugo natural de lulo colombiano, preparado al momento. Puedes pedirlo en agua o en leche. Disponible sin azúcar.',
    precio: 5000,
    categoria: 'Bebidas',
    disponible: true,
    emoji: '🥤',
    ingredientes: ['Lulo', 'Agua', 'Azúcar'],
    extras: [
      { nombre: 'En leche (reemplaza agua)', precio: 1000 },
    ],
  },
  {
    id: 5,
    nombre: 'Sancocho de Gallina',
    descripcion: 'Caldo tradicional con gallina criolla de campo, papa, yuca, plátano y mazorca. Contundente y lleno de sabor. Ideal para los fríos bogotanos.',
    precio: 25000,
    categoria: 'Platos fuertes',
    disponible: false,
    emoji: '🍗',
    ingredientes: ['Gallina criolla', 'Papa', 'Yuca', 'Plátano', 'Mazorca', 'Cilantro'],
    extras: [],
  },
  {
    id: 6,
    nombre: 'Patacones con Hogao',
    descripcion: 'Patacones de plátano verde dos veces fritos hasta quedar crujientes, acompañados de hogao casero (tomate y cebolla) y queso costeño rallado.',
    precio: 8000,
    categoria: 'Entradas',
    disponible: true,
    emoji: '🍌',
    ingredientes: ['Plátano verde', 'Hogao', 'Queso costeño', 'Sal'],
    extras: [
      { nombre: 'Extra hogao',         precio: 1000 },
      { nombre: 'Guacamole casero',    precio: 2500 },
      { nombre: 'Suero costeño',       precio: 1500 },
    ],
  },
  {
    id: 7,
    nombre: 'Agua Panela con Limón',
    descripcion: 'Bebida tradicional colombiana hecha con panela de caña de azúcar disuelta en agua caliente y zumo de limón. Dulce, cítrica y reconfortante.',
    precio: 3500,
    categoria: 'Bebidas',
    disponible: true,
    emoji: '🍋',
    ingredientes: ['Panela', 'Agua', 'Limón'],
    extras: [
      { nombre: 'Extra panela (más dulce)', precio: 500 },
    ],
  },
  {
    id: 8,
    nombre: 'Arroz con Leche',
    descripcion: 'Postre tradicional colombiano con arroz cocinado a fuego lento en leche, canela en rama, clavo y leche condensada. Cremoso y bien especiado.',
    precio: 6000,
    categoria: 'Postres',
    disponible: true,
    emoji: '🍚',
    ingredientes: ['Arroz', 'Leche', 'Leche condensada', 'Canela', 'Clavo'],
    extras: [
      { nombre: 'Arequipe encima', precio: 1500 },
      { nombre: 'Coco rallado',    precio: 1000 },
    ],
  },
];

const CATEGORIAS = ['Todos', 'Entradas', 'Platos fuertes', 'Bebidas', 'Postres'];

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function MenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { count } = useCarrito();

  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [cartOpen, setCartOpen]   = useState(false);
  const [platoModal, setPlatoModal] = useState<Plato | null>(null);

  const platosFiltrados =
    categoriaActiva === 'Todos'
      ? PLATOS
      : PLATOS.filter((p) => p.categoria === categoriaActiva);

  const esCliente = user?.rol === 'cliente';
  const esAdmin   = user?.rol === 'admin';
  const esInvitado = !user;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <span className={styles.logo}>🍽️</span>
            <div>
              <h1 className={styles.restaurantName}>Operación Remi</h1>
              <p className={styles.tagline}>Haz tu pedido — sin filas</p>
            </div>
          </div>

          <div className={styles.headerRight}>
            {esInvitado && (
              <>
                <Link to="/login"   className={styles.linkSecondary}>Ingresar</Link>
                <Link to="/registro" className={styles.linkPrimary}>Crear cuenta</Link>
              </>
            )}

            {esAdmin && (
              <Link to="/admin" className={styles.adminBackBtn}>
                ← Admin
              </Link>
            )}

            {esCliente && (
              <span className={styles.clienteChip}>👤 {user.nombre.split(' ')[0]}</span>
            )}

            {(esCliente) && (
              <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}

            <button
              className={styles.cartBtn}
              onClick={() => setCartOpen(true)}
              aria-label={`Carrito — ${count} productos`}
            >
              🛒
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </button>
          </div>
        </div>

        {/* Filtros de categoría */}
        <div className={styles.catScroll}>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              className={`${styles.catChip} ${cat === categoriaActiva ? styles.catChipActive : ''}`}
              onClick={() => setCategoriaActiva(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* ── Galería ── */}
      <main className={styles.main}>
        <p className={styles.seccionLabel}>
          {categoriaActiva === 'Todos'
            ? `${PLATOS.filter(p => p.disponible).length} platos disponibles`
            : `${platosFiltrados.filter(p => p.disponible).length} en ${categoriaActiva}`}
        </p>

        <div className={styles.gallery}>
          {platosFiltrados.map((plato) => (
            <button
              key={plato.id}
              className={`${styles.card} ${!plato.disponible ? styles.cardUnavailable : ''}`}
              onClick={() => plato.disponible && setPlatoModal(plato)}
              disabled={!plato.disponible}
            >
              <div className={styles.cardImg}>
                <PlatoImage
                  nombre={plato.nombre}
                  categoria={plato.categoria}
                  size="xl"
                />
                {!plato.disponible && (
                  <div className={styles.unavailableOverlay}>No disponible</div>
                )}
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardNombre}>{plato.nombre}</p>
                <p className={styles.cardPrecio}>{formatPrecio(plato.precio)}</p>
              </div>
              {plato.disponible && (
                <div className={styles.cardAddBtn} aria-hidden="true">+</div>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* ── Modals & Drawers ── */}
      {platoModal && (
        <PlatoModal
          plato={platoModal}
          onClose={() => setPlatoModal(null)}
          onAdded={() => setPlatoModal(null)}
        />
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
