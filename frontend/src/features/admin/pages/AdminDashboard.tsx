import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import styles from './AdminDashboard.module.css';

const STATS = [
  { label: 'Pedidos hoy', value: '6', icon: '📋', color: '#3b82f6' },
  { label: 'Ingresos hoy', value: '$198K', icon: '💰', color: '#16a34a' },
  { label: 'Platos activos', value: '7', icon: '🍽️', color: '#d4500a' },
  { label: 'Usuarios', value: '6', icon: '👥', color: '#7c3aed' },
];

const NAV_ITEMS = [
  { label: 'Gestión de Menú',  desc: 'Crear, editar y eliminar platos',     icon: '🍴', to: '/admin/menu'          },
  { label: 'Ingredientes',     desc: 'Stock, alertas y platos afectados',    icon: '🧂', to: '/admin/ingredientes'   },
  { label: 'Pedidos',          desc: 'Ver todos los pedidos en curso',       icon: '📦', to: '/admin/pedidos'        },
  { label: 'Domicilios',       desc: 'Asignar y monitorear entregas',        icon: '🛵', to: '/admin/domicilios'     },
  { label: 'Usuarios',         desc: 'Gestionar roles y accesos',            icon: '👤', to: '/admin/usuarios'       },
  { label: 'Estadísticas',     desc: 'Reportes de ventas y métricas',        icon: '📊', to: '/admin/estadisticas'   },
  { label: 'Configuración',    desc: 'Ajustes generales del sistema',        icon: '⚙️', to: null                   },
];

export function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout title="Dashboard">
      <div className={styles.wrapper}>
        <div className={styles.welcome}>
          <h2 className={styles.welcomeTitle}>Bienvenido al panel</h2>
          <p className={styles.welcomeText}>
            Gestiona el menú, los pedidos, los usuarios y las métricas del restaurante.
          </p>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${stat.color}18` }}>
                {stat.icon}
              </div>
              <div>
                <p className={styles.statValue}>{stat.value}</p>
                <p className={styles.statLabel}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Módulos */}
        <h3 className={styles.sectionTitle}>Módulos</h3>
        <div className={styles.navGrid}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`${styles.navCard} ${!item.to ? styles.navCardDisabled : ''}`}
              onClick={() => item.to && navigate(item.to)}
              disabled={!item.to}
            >
              <div className={styles.navIcon}>{item.icon}</div>
              <div className={styles.navContent}>
                <p className={styles.navLabel}>{item.label}</p>
                <p className={styles.navDesc}>{item.desc}</p>
              </div>
              {item.to ? (
                <span className={styles.navArrow}>→</span>
              ) : (
                <span className={styles.navTag}>Próximamente</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
