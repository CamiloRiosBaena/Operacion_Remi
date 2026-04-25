import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegistroPage } from '@/features/auth/pages/RegistroPage';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { AdminDashboard } from '@/features/admin/pages/AdminDashboard';
import { MenuGestion } from '@/features/admin/pages/MenuGestion';
import { UsuariosGestion } from '@/features/admin/pages/UsuariosGestion';
import { EstadisticasPage } from '@/features/admin/pages/EstadisticasPage';
import { PedidosAdmin } from '@/features/admin/pages/PedidosAdmin';
import { DomiciliosAdmin } from '@/features/admin/pages/DomiciliosAdmin';
import { IngredientesGestion } from '@/features/admin/pages/IngredientesGestion';
import { MesasAdmin } from '@/features/admin/pages/MesasAdmin';
import { CocinaDashboard } from '@/features/cocina/pages/CocinaDashboard';
import { DomiciliosDashboard } from '@/features/domicilios/pages/DomiciliosDashboard';
import { MenuPage } from '@/features/menu/pages/MenuPage';
import { RoleRedirect } from './RoleRedirect';

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin']}>{children}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  { path: '/', element: <ProtectedRoute><RoleRedirect /></ProtectedRoute> },

  // Auth
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },

  // Menú público (QR o cliente registrado)
  { path: '/menu', element: <MenuPage /> },

  // ── Admin ─────────────────────────────────────────────────────
  { path: '/admin',               element: <AdminRoute><AdminDashboard /></AdminRoute> },
  { path: '/admin/menu',          element: <AdminRoute><MenuGestion /></AdminRoute> },
  { path: '/admin/pedidos',       element: <AdminRoute><PedidosAdmin /></AdminRoute> },
  { path: '/admin/domicilios',    element: <AdminRoute><DomiciliosAdmin /></AdminRoute> },
  { path: '/admin/usuarios',      element: <AdminRoute><UsuariosGestion /></AdminRoute> },
  { path: '/admin/estadisticas',  element: <AdminRoute><EstadisticasPage /></AdminRoute> },
  { path: '/admin/ingredientes',  element: <AdminRoute><IngredientesGestion /></AdminRoute> },
  { path: '/admin/mesas',         element: <AdminRoute><MesasAdmin /></AdminRoute> },

  // ── Staff ──────────────────────────────────────────────────────
  { path: '/cocina',      element: <ProtectedRoute allowedRoles={['cocinero']}><CocinaDashboard /></ProtectedRoute> },
  { path: '/domicilios',  element: <ProtectedRoute allowedRoles={['domiciliario']}><DomiciliosDashboard /></ProtectedRoute> },

  {
    path: '/no-autorizado',
    element: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '1rem', fontFamily: 'system-ui, sans-serif' }}>
        <span style={{ fontSize: '3rem' }}>🚫</span>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1c1917' }}>Sin autorización</h1>
        <p style={{ margin: 0, color: '#78716c' }}>No tienes permiso para acceder a esta sección.</p>
        <a href="/login" style={{ color: '#d4500a', fontWeight: 600 }}>Volver al login</a>
      </div>
    ),
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
