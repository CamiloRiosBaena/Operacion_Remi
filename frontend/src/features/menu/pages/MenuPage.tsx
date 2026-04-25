import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { CartDrawer } from '@/features/carrito/components/CartDrawer';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { PlatoModal } from '../components/PlatoModal';
import { MenuBanner } from '../components/MenuBanner';
import { usePlatos } from '../context/PlatosContext';
import { RemiLogo } from '@/shared/components/RemiLogo';
import type { Plato } from '../types/plato.types';
import styles from './MenuPage.module.css';

export type { Plato };


function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function MenuPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { count } = useCarrito();
  const [searchParams] = useSearchParams();

  const { platos } = usePlatos();

  const secciones = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of platos) {
      if (p.categoria && !seen.has(p.categoria)) {
        seen.add(p.categoria);
        result.push(p.categoria);
      }
    }
    return result;
  }, [platos]);

  const categorias = useMemo(() => ['Todos', ...secciones], [secciones]);

  const mesaQr = searchParams.get('mesa') ? Number(searchParams.get('mesa')) : undefined;

  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [cartOpen, setCartOpen]   = useState(false);
  const [platoModal, setPlatoModal] = useState<Plato | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 320);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const esCliente = user?.rol === 'cliente';
  const esAdmin   = user?.rol === 'admin';
  const esInvitado = !user;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function scrollToSection(cat: string) {
    setCategoriaActiva(cat);
    if (cat === 'Todos') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = sectionRefs.current[cat];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const platosPorCategoria = secciones.reduce<Record<string, Plato[]>>((acc, cat) => {
    acc[cat] = platos.filter((p) => p.categoria === cat);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <RemiLogo size={38} />
            <div>
              <h1 className={styles.restaurantName}>Remi</h1>
              <p className={styles.tagline}>Haz tu pedido — sin filas</p>
            </div>
          </div>

          <div className={styles.headerRight}>
            {esInvitado && (
              <>
                <Link to="/login"    className={styles.linkSecondary}>Ingresar</Link>
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

            {esCliente && (
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

        {/* Filtros de categoría — ahora hacen scroll a la sección */}
        <div className={styles.catScroll}>
          {categorias.map((cat) => (
            <button
              key={cat}
              className={`${styles.catChip} ${cat === categoriaActiva ? styles.catChipActive : ''}`}
              onClick={() => scrollToSection(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* ── Banner de mesa (cuando viene de un QR) ── */}
      {mesaQr && (
        <div style={{
          background: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#9a3412',
          fontWeight: 500,
        }}>
          🪑 Estás en <strong>Mesa {mesaQr}</strong> — tu pedido se registrará en esta mesa
        </div>
      )}

      {/* ── Main content ── */}
      <main className={styles.main}>
        <MenuBanner
          platos={platos}
          onPlatoClick={(plato) => setPlatoModal(plato)}
          onCategoriaClick={(cat) => scrollToSection(cat)}
        />

        {secciones.map((cat) => {
          const items = platosPorCategoria[cat];
          if (!items || items.length === 0) return null;

          return (
            <section
              key={cat}
              ref={(el) => { sectionRefs.current[cat] = el; }}
              className={styles.seccion}
            >
              <h2 className={styles.seccionTitulo}>{cat}</h2>
              <p className={styles.seccionLabel}>
                {items.filter((p) => p.disponible).length} disponibles
              </p>

              <div className={styles.gallery}>
                {items.map((plato) => (
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
                        imageUrl={plato.imageUrl}
                        size="xl"
                      />
                      {!plato.disponible && (
                        <div className={styles.unavailableOverlay}>No disponible</div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardNombre}>{plato.nombre}</p>
                      <p className={styles.cardPrecio}>{formatPrecio(Math.round(plato.precio * (1 + plato.tasaIva)))}</p>
                    </div>
                    {plato.disponible && (
                      <div className={styles.cardAddBtn} aria-hidden="true">+</div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* ── Botón volver arriba ── */}
      <button
        className={`${styles.backToTopBtn} ${showBackToTop ? styles.backToTopVisible : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver al inicio"
      >
        ↑
      </button>

      {/* ── Modals & Drawers ── */}
      {platoModal && (
        <PlatoModal
          plato={platoModal}
          onClose={() => setPlatoModal(null)}
          onAdded={() => setPlatoModal(null)}
        />
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} mesaQr={mesaQr} />
    </div>
  );
}
