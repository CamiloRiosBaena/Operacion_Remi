import { type ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import styles from './AdminLayout.module.css';
import '../styles/admin.css';

/* ── Icon system ── */
const ICON_PATHS: Record<string, string> = {
  dashboard:    '<path d="M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-5H4z"/>',
  menu:         '<path d="M7 3v8M5 3v3a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4 0 0 0 0M17 12v9"/>',
  banner:       '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15.5 8.5a4 4 0 0 1 0 7M18 6a7 7 0 0 1 0 12"/>',
  ingredients:  '<path d="M11 20c-3.5 0-7-2.5-7-7 3.5 0 7 2.5 7 7Z"/><path d="M11 20c0-6 3-11 9-13-1 7-4 13-9 13Z"/><path d="M14.5 8.5 18 5"/>',
  orders:       '<path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v4h4M9 11h6M9 15h6M9 7h2"/>',
  local:        '<path d="M4 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M5 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>',
  delivery:     '<circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/>',
  tables:       '<path d="M4 9h16M5 9 4 4M19 9l1-5M7 9v11M17 9v11M9.5 9v5h5V9"/>',
  users:        '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M16.5 14.5a5.5 5.5 0 0 1 4 5.5"/>',
  stats:        '<path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/>',
  settings:     '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  logout:       '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
  search:       '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell:         '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  dish:         '<path d="M3 11a9 9 0 0 1 18 0Z"/><path d="M2 11h20M12 6V3M11 3h2"/>',
};

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const body = ICON_PATHS[name] || '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>';
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

/* ── Nav items ── */
const NAV = [
  { to: '/admin',              label: 'Dashboard',        icon: 'dashboard', exact: true },
  { to: '/admin/menu',         label: 'Gestión de Menú',  icon: 'menu' },
  { to: '/admin/promos',       label: 'Banners',          icon: 'banner' },
  { to: '/admin/ingredientes', label: 'Ingredientes',     icon: 'ingredients' },
  { to: '/admin/pedidos',      label: 'Pedidos',          icon: 'orders' },
  { to: '/admin/local',        label: 'Entrega en Local', icon: 'local' },
  { to: '/admin/domicilios',   label: 'Domicilios',       icon: 'delivery' },
  { to: '/admin/mesas',        label: 'Mesas y QR',       icon: 'tables' },
  { to: '/admin/usuarios',     label: 'Usuarios',         icon: 'users' },
  { to: '/admin/estadisticas', label: 'Estadísticas',     icon: 'stats' },
];

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Avatar initials
  const initials = user?.nombre
    ? user.nombre.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <div className={styles.shell}>
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Icon name="dish" size={23} />
          </div>
          <div>
            <div className={styles.brandName}>Remi</div>
            <div className={styles.brandSub}>PANEL ADMIN</div>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          <div className={styles.navLabel}>PRINCIPAL</div>
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
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFoot}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <div className={styles.userName}>{user?.nombre || 'Admin'}</div>
              <div className={styles.userRole}>ADMINISTRADOR</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <Icon name="logout" size={16} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
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
          <div className={styles.crumb}>
            <h1 className={styles.pageTitle}>{title}</h1>
            {subtitle && <span className={styles.pageSubtitle}>{subtitle}</span>}
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
