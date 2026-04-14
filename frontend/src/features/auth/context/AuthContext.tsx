import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { AuthContextValue, AuthState, LoginCredentials } from '../types/auth.types';
import { loginService, registroService, type RegistroData } from '../services/auth.service';

interface ExtendedAuthContextValue extends AuthContextValue {
  registrar: (data: RegistroData) => Promise<void>;
}

const AuthContext = createContext<ExtendedAuthContextValue | null>(null);

const STORAGE_KEY = 'remi_auth';

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, isAuthenticated: false };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, token: null, isAuthenticated: false };
  }
}

function persist(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSession = useCallback((user: AuthState['user'], token: string) => {
    const next: AuthState = { user, token, isAuthenticated: true };
    setState(next);
    persist(next);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user, token } = await loginService(credentials);
      setSession(user, token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setSession]);

  const registrar = useCallback(async (data: RegistroData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { user, token } = await registroService(data);
      setSession(user, token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setSession]);

  const logout = useCallback(() => {
    setState({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem(STORAGE_KEY);
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
