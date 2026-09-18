import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { CartDrawer } from '@/features/carrito/components/CartDrawer';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { PlatoModal } from '../components/PlatoModal';
import { MenuBanner } from '../components/MenuBanner';
import { OrderTracker } from '../components/OrderTracker';
import { usePlatos } from '../context/PlatosContext';
import { RemiLogo } from '@/shared/components/RemiLogo';
import { getActivePedido, clearActivePedido } from '@/shared/lib/guestSession';
import type { Plato } from '../types/plato.types';
import { ChatWidget } from '@/features/asistente/components/ChatWidget';
import styles from './MenuPage.module.css';

export type { Plato };

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function MenuPage() {
  const { user, logout } = useAuth();
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
  const resolvePedidoId = useCallback(() => {
    const pedido = getActivePedido();
    if (!pedido) return null;
    // Pedido de cliente: solo visible si el usuario actual es el dueño
    if (pedido.clienteId && pedido.clienteId !== user?.id) return null;
    return pedido.id;
  }, [user?.id]);

  const [activePedidoId, setActivePedidoId] = useState<number | null>(resolvePedidoId);

  // Re-evaluar cuando cambia la sesión (login / logout)
  useEffect(() => {
    setActivePedidoId(resolvePedidoId());
  }, [resolvePedidoId]);

  // Refresca el pedido activo cuando el CartDrawer crea uno nuevo
  const handlePedidoCreado = useCallback(() => {
    setActivePedidoId(resolvePedidoId());
  }, [resolvePedidoId]);

  const handleTrackerClose = useCallback(() => {
    clearActivePedido();
    setActivePedidoId(null);
  }, []);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Scroll listener para botón volver arriba ──
  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 320);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Efecto de hierbas & especias flotantes ──
  useEffect(() => {
    const canvas = document.getElementById('bgCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // ── Hoja de albahaca / laurel ──
    function drawLeaf(
      ctx: CanvasRenderingContext2D,
      x: number, y: number,
      size: number, angle: number, alpha: number
    ) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo( size * 0.65, -size * 0.4,  size * 0.65,  size * 0.4, 0,  size);
      ctx.bezierCurveTo(-size * 0.65,  size * 0.4, -size * 0.65, -size * 0.4, 0, -size);
      ctx.fillStyle = '#4a7a2e';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(0,  size);
      ctx.strokeStyle = 'rgba(120,200,70,0.45)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // ── Estrella de anís ──
    function drawStar(
      ctx: CanvasRenderingContext2D,
      x: number, y: number,
      r: number, angle: number, alpha: number
    ) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      const pts = 8;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const rad = i % 2 === 0 ? r : r * 0.42;
        const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(196,168,130,0.75)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(196,168,130,0.5)';
      ctx.fill();
      ctx.restore();
    }

    // ── Grano de pimienta ──
    function drawPepper(
      ctx: CanvasRenderingContext2D,
      x: number, y: number,
      r: number, alpha: number
    ) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#6b1a1a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.restore();
    }

    // ── Ramita / palito de canela ──
    function drawTwig(
      ctx: CanvasRenderingContext2D,
      x: number, y: number,
      len: number, angle: number, alpha: number
    ) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, -len / 2);
      ctx.lineTo(0,  len / 2);
      ctx.strokeStyle = '#8b5e3c';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,120,60,0.35)';
      ctx.lineWidth = 0.8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-2, i * len * 0.28);
        ctx.lineTo( 2, i * len * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    }

    type ParticleType = 'leaf' | 'star' | 'pepper' | 'twig';

    interface Particle {
      type: ParticleType;
      x: number; y: number;
      size: number;
      speed: number;
      drift: number;
      angle: number;
      angleSpeed: number;
      alpha: number;
    }

    const TYPES: ParticleType[] = ['leaf', 'leaf', 'leaf', 'star', 'pepper', 'pepper', 'twig'];

    function makeParticle(init: boolean): Particle {
      return {
        type:       TYPES[Math.floor(Math.random() * TYPES.length)],
        x:          rand(0, canvas.width),
        y:          init ? rand(0, canvas.height) : canvas.height + 20,
        size:       rand(5, 12),
        speed:      rand(0.25, 0.75),
        drift:      rand(-0.2, 0.2),
        angle:      rand(0, Math.PI * 2),
        angleSpeed: rand(-0.008, 0.008),
        alpha:      rand(0.12, 0.38),
      };
    }

    const particles: Particle[] = Array.from({ length: 48 }, () => makeParticle(true));
    let raf: number;

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.y     -= p.speed;
        p.x     += p.drift + Math.sin(p.angle * 0.4) * 0.18;
        p.angle += p.angleSpeed;

        if (p.y < -20) {
          Object.assign(p, makeParticle(false));
        }

        switch (p.type) {
          case 'leaf':   drawLeaf  (ctx, p.x, p.y, p.size,        p.angle, p.alpha); break;
          case 'star':   drawStar  (ctx, p.x, p.y, p.size,        p.angle, p.alpha); break;
          case 'pepper': drawPepper(ctx, p.x, p.y, p.size * 0.45,          p.alpha); break;
          case 'twig':   drawTwig  (ctx, p.x, p.y, p.size * 2.2,  p.angle, p.alpha); break;
        }
      }

      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const esCliente  = user?.rol === 'cliente';
  const esInvitado = !user;

  function handleLogout() {
    logout();
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

      {/* ── Canvas fondo animado (hierbas & especias) ── */}
      <canvas id="bgCanvas" className={styles.bgCanvas} />

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

          {/* Categorías — inline entre brand y acciones */}
          <nav className={styles.catScroll}>
            {categorias.map((cat) => (
              <button
                key={cat}
                className={`${styles.catChip} ${cat === categoriaActiva ? styles.catChipActive : ''}`}
                onClick={() => scrollToSection(cat)}
              >
                {cat}
              </button>
            ))}
          </nav>

          <div className={styles.headerRight}>
            {esInvitado && (
              <>
                <Link to="/login"    className={styles.linkSecondary}>Ingresar</Link>
                <Link to="/registro" className={styles.linkPrimary}>Crear cuenta</Link>
              </>
            )}
            {esCliente && (
              <span className={styles.clienteChip}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
                {user.nombre.split(' ')[0]}
              </span>
            )}
            {esCliente && (
              <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            )}
            <button className={styles.cartBtn} onClick={() => setCartOpen(true)} aria-label={`Carrito — ${count} productos`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── Banner de mesa ── */}
      {mesaQr && (
        <div className={styles.mesaChip}>
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

        {/* ── Tracker de pedido activo (debajo del banner) ── */}
        <OrderTracker
          pedidoId={activePedidoId}
          onClose={handleTrackerClose}
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
              <div className={styles.seccionHead}>
                <h2 className={styles.seccionTitulo}>{cat}</h2>
                <span className={styles.seccionLabel}>
                  {items.filter((p) => p.disponible).length} disponibles
                </span>
                <div className={styles.seccionRule} />
              </div>

              <div className={styles.gallery}>
                {items.map((plato) => (
                  <button
                    key={plato.id}
                    className={`${styles.card} ${!plato.disponible ? styles.cardUnavailable : ''}`}
                    onClick={() => plato.disponible && setPlatoModal(plato)}
                    disabled={!plato.disponible}
                  >
                    <div className={styles.cardImg}>
                      <button
                        className={styles.cardFav}
                        onClick={e => e.stopPropagation()}
                        aria-label="Favorito"
                        tabIndex={-1}
                      >♡</button>
                      <PlatoImage
                        nombre={plato.nombre}
                        categoria={plato.categoria}
                        imageUrl={plato.imageUrl}
                        size="xl"
                      />
                      {!plato.disponible && (
                        <div className={styles.unavailableOverlay}>Agotado</div>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardNombre}>{plato.nombre}</div>
                      {plato.descripcion && (
                        <p className={styles.cardDesc}>{plato.descripcion}</p>
                      )}
                      <div className={styles.cardFoot}>
                        <span className={styles.cardPrecio}>
                          {formatPrecio(Math.round(plato.precio * (1 + plato.tasaIva)))}
                        </span>
                        {plato.disponible && (
                          <span className={styles.cardAddBtn} aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                            Agregar
                          </span>
                        )}
                      </div>
                    </div>
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

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        mesaQr={mesaQr}
        onPedidoCreado={handlePedidoCreado}
      />

      <ChatWidget hidden={cartOpen || !!platoModal} />
    </div>
  );
}