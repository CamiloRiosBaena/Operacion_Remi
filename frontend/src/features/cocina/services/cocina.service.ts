import { apiFetch } from '@/shared/lib/api';
import type { ApiPedido, ApiStaff } from '@/features/admin/services/admin.service';

export function fetchPedidosCocina(): Promise<ApiPedido[]> {
  return apiFetch<ApiPedido[]>('/cocina/pedidos');
}

export function marcarEnCocina(id: number): Promise<ApiPedido> {
  return apiFetch<ApiPedido>(`/cocina/pedidos/${id}/en-cocina`, { method: 'PATCH' });
}

export function marcarListo(id: number): Promise<ApiPedido> {
  return apiFetch<ApiPedido>(`/cocina/pedidos/${id}/listo`, { method: 'PATCH' });
}

export function fetchPedidosDespacho(): Promise<ApiPedido[]> {
  return apiFetch<ApiPedido[]>('/cocina/despacho');
}

export function fetchDomiciliarios(): Promise<ApiStaff[]> {
  return apiFetch<ApiStaff[]>('/cocina/domiciliarios');
}

export function despacharRuta(pedidoIds: number[], domiciliarioId: number): Promise<ApiPedido[]> {
  return apiFetch<ApiPedido[]>('/cocina/despacho', {
    method: 'POST',
    body: { pedidoIds, domiciliarioId },
  });
}