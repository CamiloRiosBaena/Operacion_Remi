import { apiFetch } from '@/shared/lib/api';

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
