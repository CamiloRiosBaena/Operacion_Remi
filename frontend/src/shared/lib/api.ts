import { supabase } from './supabase';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  body?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const { data: { session } } = await supabase.auth.getSession();
  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const data = await res.json();
      mensaje = Array.isArray(data.message)
        ? data.message.join(', ')
        : (data.message ?? mensaje);
    } catch {
      /* sin body JSON */
    }
    throw new Error(mensaje);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
