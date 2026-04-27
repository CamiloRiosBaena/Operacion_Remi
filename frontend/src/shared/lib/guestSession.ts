/**
 * guestSession.ts
 * Maneja la sesión anónima del cliente (sin cuenta) usando localStorage.
 * También guarda el pedido activo para mostrarlo en el tracker del menú.
 */

const KEY_TOKEN   = 'remi_session_token';
const KEY_PEDIDO  = 'remi_active_pedido';

// ─────────────────────────────────────────
// TOKEN DE SESIÓN
// ─────────────────────────────────────────

export function getGuestToken(): string | null {
  try { return localStorage.getItem(KEY_TOKEN); }
  catch { return null; }
}

export function setGuestToken(token: string): void {
  try { localStorage.setItem(KEY_TOKEN, token); }
  catch { /* safari private mode */ }
}

/** Llama al backend para crear una sesión y persiste el token. */
export async function initGuestSession(apiUrl: string): Promise<string> {
  const existing = getGuestToken();
  if (existing) return existing;

  const res = await fetch(`${apiUrl}/auth/sesiones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plataforma: 'web' }),
  });

  if (!res.ok) throw new Error('No se pudo crear la sesión de invitado');

  const data = await res.json() as { tokenSesion: string };
  setGuestToken(data.tokenSesion);
  return data.tokenSesion;
}

// ─────────────────────────────────────────
// PEDIDO ACTIVO
// ─────────────────────────────────────────

export interface ActivePedido {
  id: number;
  tipo: 'mesa' | 'domicilio' | 'llevar';
  estado: string;
  /** ID de Supabase del cliente si fue hecho con sesión. Ausente = pedido de invitado. */
  clienteId?: string;
}

export function getActivePedido(): ActivePedido | null {
  try {
    const raw = localStorage.getItem(KEY_PEDIDO);
    return raw ? (JSON.parse(raw) as ActivePedido) : null;
  } catch { return null; }
}

export function setActivePedido(pedido: ActivePedido): void {
  try { localStorage.setItem(KEY_PEDIDO, JSON.stringify(pedido)); }
  catch { /* safari private mode */ }
}

export function clearActivePedido(): void {
  try { localStorage.removeItem(KEY_PEDIDO); }
  catch { /* noop */ }
}

/** Borra el pedido activo si ya está en estado terminal */
export function clearIfTerminal(estado: string): void {
  if (estado === 'entregado' || estado === 'cancelado') {
    clearActivePedido();
  }
}
