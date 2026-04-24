import { supabase } from '@/shared/lib/supabase';
import { apiFetch } from '@/shared/lib/api';
import type { LoginCredentials, User, UserRole } from '../types/auth.types';

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegistroData {
  nombre: string;
  correo: string;
  contrasena: string;
}

function sbUserToUser(sbUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): User {
  return {
    id: sbUser.id,
    nombre: (sbUser.user_metadata?.nombre as string) ?? sbUser.email ?? '',
    correo: sbUser.email ?? '',
    rol: (sbUser.user_metadata?.rol as UserRole) ?? 'cliente',
  };
}

export async function loginService(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.correo,
    password: credentials.contrasena,
  });

  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error('Error al iniciar sesión');

  return { user: sbUserToUser(data.user), token: data.session.access_token };
}

export async function registroService(data: RegistroData): Promise<AuthResponse> {
  // El backend crea el usuario en Supabase con email_confirm:true (sin enviar correo)
  // y luego lo sincroniza en nuestra DB en un solo paso.
  await apiFetch('/auth/registro', {
    method: 'POST',
    body: { nombre: data.nombre, correo: data.correo, contrasena: data.contrasena },
  });

  // Con la cuenta creada, iniciamos sesión para obtener el token
  return loginService({ correo: data.correo, contrasena: data.contrasena });
}
