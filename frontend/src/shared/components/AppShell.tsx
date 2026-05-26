import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import styles from './AppShell.module.css';

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  cocinero: 'Cocina',
  domiciliario: 'Domiciliario',
  cliente: 'Cliente',
};

const ROL_EMOJI: Record<string, string> = {
  admin: '⚙️',
  cocinero: '👨‍🍳',
  domiciliario: '🛵',
  cliente: '🛒',
};

interface Props {
  children: ReactNode;
  title: string;
  backTo?: string;
}

export function AppShell({ children, title, backTo }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {backTo && (
            <button className={styles.backBtn} onClick={() => navigate(backTo)} aria-label="Volver">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className={styles.brandMark}>🍽️</span>
          <span className={styles.brandName}>Remi</span>
          <span className={styles.separator}>/</span>
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>

        {user && (
          <div className={styles.headerRight}>
            <div className={styles.userBadge}>
              <span className={styles.userEmoji}>{ROL_EMOJI[user.rol]}</span>
              <span className={styles.userInfo}>
                <span className={styles.userName}>{user.nombre}</span>
                <span className={styles.userRol}>{ROL_LABEL[user.rol]}</span>
              </span>
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Salir</span>
            </button>
          </div>
        )}
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
