import { apiFetch, API_URL } from '@/shared/lib/api';

export type TipoPedido = 'mesa' | 'domicilio' | 'llevar';

export interface Mesa {
  id: number;
  numero: number;
  estado: 'libre' | 'ocupada' | 'reservada';
}

export interface DetallePedidoInput {
  platoId: number;
  cantidad: number;
  personalizacion?: string;  // JSON serializado
}

export interface CreatePedidoInput {
  tipo: TipoPedido;
  clienteId?: number;
  mesaId?: number;
  direccionEntrega?: string;
  /** Token de sesión de invitado para vincular el pedido y enviar push notifications */
  tokenSesion?: string;
  detalles: DetallePedidoInput[];
}

export interface PedidoCreado {
  id: number;
  tipo: TipoPedido;
  estado: string;
  total: number;
  fechaHora: string;
}

export async function fetchMesas(): Promise<Mesa[]> {
  return apiFetch<Mesa[]>('/pedidos/mesas/todas');
}

export async function createPedido(input: CreatePedidoInput): Promise<PedidoCreado> {
  return apiFetch<PedidoCreado>('/pedidos', { method: 'POST', body: input });
}

export async function fetchQrTokenPublico(pedidoId: number): Promise<{ token: string; expiracion: string }> {
  const res = await fetch(`${API_URL}/pedidos/${pedidoId}/qr`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Error al obtener el QR');
  }
  return res.json() as Promise<{ token: string; expiracion: string }>;
}
