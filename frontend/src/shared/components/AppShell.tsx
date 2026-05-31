import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import styles from './AppShell.module.css';

const ROL_LABEL: Record<string, string> = {
  admin:        'ADMIN',
  cocinero:     'COCINA',
  domiciliario: 'DOMICILIARIO',
  cliente:      'CLIENTE',
};

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0Z"/>
  </svg>
);

const DishIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11a9 9 0 0 1 18 0Z"/><path d="M2 11h20M12 6V3M11 3h2"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
  </svg>
);

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
              <ArrowLeft />
            </button>
          )}
          <div className={styles.brandMark}>
            <DishIcon />
          </div>
          <span className={styles.brandName}>Remi</span>
          <span className={styles.separator}>/</span>
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>

        {user && (
          <div className={styles.headerRight}>
            <div className={styles.userText}>
              <span className={styles.userName}>{user.nombre}</span>
              <span className={styles.userRol}>{ROL_LABEL[user.rol] ?? user.rol.toUpperCase()}</span>
            </div>
            <div className={styles.userAvatar}>
              <UserIcon />
            </div>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogoutIcon />
              <span>Salir</span>
            </button>
          </div>
        )}
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
