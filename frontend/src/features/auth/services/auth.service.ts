import type { LoginCredentials, User } from '../types/auth.types';

// ── Usuarios base del sistema (staff) ───────────────────────────────────────
const MOCK_USERS: (User & { contrasena: string })[] = [
  { id: '1', nombre: 'Admin Remi', correo: 'admin@remi.com', rol: 'admin', contrasena: 'admin123' },
  { id: '2', nombre: 'Chef Carlos', correo: 'cocina@remi.com', rol: 'cocinero', contrasena: 'cocina123' },
  { id: '3', nombre: 'Repartidor Juan', correo: 'domicilio@remi.com', rol: 'domiciliario', contrasena: 'domicilio123' },
];

// Clientes registrados en sesión (se pierde al recargar — OK para demo)
const clientesRegistrados: (User & { contrasena: string })[] = [];

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegistroData {
  nombre: string;
  correo: string;
  contrasena: string;
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function loginService(credentials: LoginCredentials): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const todos = [...MOCK_USERS, ...clientesRegistrados];
  const found = todos.find(
    (u) => u.correo === credentials.correo && u.contrasena === credentials.contrasena,
  );

  if (!found) throw new Error('Correo o contraseña incorrectos');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contrasena: _removed, ...user } = found;
  return { user, token: `mock-jwt-${user.id}-${Date.now()}` };
}

// ── Registro de cliente ──────────────────────────────────────────────────────
export async function registroService(data: RegistroData): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const todos = [...MOCK_USERS, ...clientesRegistrados];
  if (todos.find((u) => u.correo === data.correo)) {
    throw new Error('Ya existe una cuenta con ese correo');
  }

  const newUser: User & { contrasena: string } = {
    id: `c-${Date.now()}`,
    nombre: data.nombre,
    correo: data.correo,
    rol: 'cliente',
    contrasena: data.contrasena,
  };

  clientesRegistrados.push(newUser);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contrasena: _removed, ...user } = newUser;
  return { user, token: `mock-jwt-${user.id}` };
}
