import { type ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import styles from './AdminLayout.module.css';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/admin/menu', label: 'Gestión de Menú', icon: '🍴' },
  { to: '/admin/promos', label: 'Banners', icon: '📢' },
  { to: '/admin/ingredientes', label: 'Ingredientes', icon: '🧂' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '📦' },
  { to: '/escanear-entrega', label: 'Entrega en Local', icon: '📷' },
  { to: '/admin/domicilios', label: 'Domicilios', icon: '🛵' },
  { to: '/admin/mesas', label: 'Mesas y QR', icon: '🪑' },
  { to: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
  { to: '/admin/estadisticas', label: 'Estadísticas', icon: '📈' },
];

interface Props {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isRoot = location.pathname === '/admin';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.shell}>
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarBrand}>
          <span className={styles.brandEmoji}>🍽️</span>
          <div>
            <p className={styles.brandName}>Remi</p>
            <p className={styles.brandRole}>Panel Admin</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {user && (
            <div className={styles.userInfo}>
              <span className={styles.userAvatar}>⚙️</span>
              <div>
                <p className={styles.userName}>{user.nombre}</p>
                <p className={styles.userRole}>Administrador</p>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          {!isRoot && (
            <button
              className={styles.backBtn}
              onClick={() => navigate('/admin')}
              aria-label="Volver al dashboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className={styles.pageTitle}>{title}</h1>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
