import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { AuthContextValue, AuthState, LoginCredentials, User, UserRole } from '../types/auth.types';
import { loginService, registroService, type RegistroData } from '../services/auth.service';

interface ExtendedAuthContextValue extends AuthContextValue {
  registrar: (data: RegistroData) => Promise<void>;
}

const AuthContext = createContext<ExtendedAuthContextValue | null>(null);

function sbUserToState(
  sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null,
  token: string | null,
): AuthState {
  if (!sbUser || !token) return { user: null, token: null, isAuthenticated: false };
  const user: User = {
    id: sbUser.id,
    nombre: (sbUser.user_metadata?.nombre as string) ?? sbUser.email ?? '',
    correo: sbUser.email ?? '',
    rol: (sbUser.user_metadata?.rol as UserRole) ?? 'cliente',
  };
  return { user, token, isAuthenticated: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cargar sesión existente al montar (Supabase la persiste en localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(sbUserToState(session?.user ?? null, session?.access_token ?? null));
      setIsLoading(false);
    });

    // Escuchar cambios de sesión: login, logout, refresh de token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(sbUserToState(session?.user ?? null, session?.access_token ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      await loginService(credentials);
      // onAuthStateChange actualizará el state automáticamente
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registrar = useCallback(async (data: RegistroData) => {
    setIsLoading(true);
    setError(null);
    try {
      await registroService(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    // onAuthStateChange limpiará el state automáticamente
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, registrar, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
