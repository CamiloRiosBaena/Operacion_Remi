import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import { fetchDashboardStats } from '../services/admin.service';
import styles from './AdminDashboard.module.css';

const NAV_ITEMS = [
  { label: 'Gestión de Menú',  desc: 'Crear, editar y eliminar platos',     icon: '🍴', to: '/admin/menu'          },
  { label: 'Ingredientes',     desc: 'Stock, alertas y platos afectados',    icon: '🧂', to: '/admin/ingredientes'   },
  { label: 'Pedidos',          desc: 'Ver todos los pedidos en curso',       icon: '📦', to: '/admin/pedidos'        },
  { label: 'Domicilios',       desc: 'Asignar y monitorear entregas',        icon: '🛵', to: '/admin/domicilios'     },
  { label: 'Usuarios',         desc: 'Gestionar roles y accesos',            icon: '👤', to: '/admin/usuarios'       },
  { label: 'Estadísticas',     desc: 'Reportes de ventas y métricas',        icon: '📊', to: '/admin/estadisticas'   },
];

function formatPrecio(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { platos } = usePlatos();

  const [stats, setStats]       = useState({ pedidosHoy: 0, ingresosHoy: 0, totalUsuarios: 0, pedidosActivos: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  const platosActivos = platos.filter((p) => p.disponible).length;

  const STATS = [
    { label: 'Pedidos hoy',     value: loadingStats ? '…' : String(stats.pedidosHoy),      icon: '📋', color: '#3b82f6' },
    { label: 'Ingresos hoy',    value: loadingStats ? '…' : formatPrecio(stats.ingresosHoy), icon: '💰', color: '#16a34a' },
    { label: 'Platos activos',  value: String(platosActivos),                                icon: '🍽️', color: '#d4500a' },
    { label: 'Usuarios',        value: loadingStats ? '…' : String(stats.totalUsuarios),     icon: '👥', color: '#7c3aed' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className={styles.wrapper}>
        <div className={styles.welcome}>
          <h2 className={styles.welcomeTitle}>Bienvenido al panel</h2>
          <p className={styles.welcomeText}>
            Gestiona el menú, los pedidos, los usuarios y las métricas del restaurante.
            {stats.pedidosActivos > 0 && (
              <strong style={{ color: '#d4500a' }}> · {stats.pedidosActivos} pedido(s) activo(s)</strong>
            )}
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
              className={styles.navCard}
              onClick={() => navigate(item.to)}
            >
              <div className={styles.navIcon}>{item.icon}</div>
              <div className={styles.navContent}>
                <p className={styles.navLabel}>{item.label}</p>
                <p className={styles.navDesc}>{item.desc}</p>
              </div>
              <span className={styles.navArrow}>→</span>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
