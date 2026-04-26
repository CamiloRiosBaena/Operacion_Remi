import { apiFetch } from '@/shared/lib/api';
import type { ApiPedido } from '@/features/admin/services/admin.service';

export function fetchPedidosDomiciliario(): Promise<ApiPedido[]> {
  return apiFetch<ApiPedido[]>('/domicilios/pedidos');
}

export function marcarEntregado(id: number): Promise<ApiPedido> {
  return apiFetch<ApiPedido>(`/domicilios/pedidos/${id}/entregado`, { method: 'PATCH' });
}