import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { UserRole } from '@/features/auth/types/auth.types';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

/** Estado de navegación con el que /login sabe a dónde volver después de iniciar sesión. */
export interface DesdeState {
  desde?: string;
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Al recargar, la sesión de Supabase se restaura de forma asíncrona:
  // si se decide antes, el usuario termina en /login y pierde la pantalla.
  if (isLoading && !isAuthenticated) {
    return (
      <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', color: '#57534e', fontFamily: 'system-ui, sans-serif' }}>
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated) {
    const desde: DesdeState = { desde: location.pathname + location.search };
    return <Navigate to="/login" replace state={desde} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <>{children}</>;
}
