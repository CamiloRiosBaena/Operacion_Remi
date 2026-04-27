import type { TipoPedido } from '@/features/pedidos/services/pedidos.service';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface DetallePagoInput {
  platoId: number;
  cantidad: number;
  personalizacion?: string;
}

export interface GenerarPagoInput {
  tipo: TipoPedido;
  clienteId?: number;
  mesaId?: number;
  direccionEntrega?: string;
  tokenSesion?: string;
  detalles: DetallePagoInput[];
}

export interface GenerarPagoResponse {
  pagoId:      number;
  referencia:  string;
  checkoutUrl: string; // URL de Mercado Pago
}

export interface ConfirmarPagoResponse {
  pedidoId:   number;
  estado:     string;
  total:      number;
  tipo:       TipoPedido;
  referencia: string;
}

export async function generarPago(input: GenerarPagoInput): Promise<GenerarPagoResponse> {
  const res = await fetch(`${API_URL}/pagos/generar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Error al generar el pago');
  }
  return res.json() as Promise<GenerarPagoResponse>;
}

export async function pagarEfectivo(input: GenerarPagoInput): Promise<ConfirmarPagoResponse> {
  const res = await fetch(`${API_URL}/pagos/efectivo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Error al registrar el pedido');
  }
  return res.json() as Promise<ConfirmarPagoResponse>;
}

export async function confirmarPago(mpPaymentId: string): Promise<ConfirmarPagoResponse> {
  const res = await fetch(`${API_URL}/pagos/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mpPaymentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Error al confirmar el pago');
  }
  return res.json() as Promise<ConfirmarPagoResponse>;
}
