import { supabase } from './supabase';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/** Igual que RequestInit, pero el cuerpo es cualquier valor que se envía como JSON. */
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const { data: { session } } = await supabase.auth.getSession();
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('Content-Type')) finalHeaders.set('Content-Type', 'application/json');
  if (session?.access_token && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${session.access_token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: finalHeaders,
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
