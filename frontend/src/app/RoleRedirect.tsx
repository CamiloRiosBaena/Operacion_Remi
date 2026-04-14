import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { UserRole } from '@/features/auth/types/auth.types';

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  cocinero: '/cocina',
  domiciliario: '/domicilios',
  cliente: '/menu',
};

export function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.rol]} replace />;
}
