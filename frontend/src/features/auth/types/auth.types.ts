export type UserRole = 'admin' | 'cocinero' | 'domiciliario' | 'cliente';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  correo: string;
  contrasena: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}
