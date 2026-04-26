import { apiFetch } from '@/shared/lib/api';

// ── Tipos de backend ──────────────────────────────────────────────────────────

export type EstadoPedidoApi =
  | 'pendiente' | 'en_cocina' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';

export type TipoPedidoApi = 'mesa' | 'domicilio' | 'llevar';
export type RolStaff      = 'admin' | 'cocinero' | 'domiciliario';
export type EstadoStaff   = 'activo' | 'inactivo';
export type EstadoCliente = 'activo' | 'inactivo' | 'baneado';

export interface ApiDetalle {
  id: number;
  cantidad: number;
  subtotal: number;
  montoIva: number;
  personalizacion: string | null;
  plato: { id: number; nombre: string; precio: number };
}

export interface ApiHistorialEstado {
  id: number;
  estado: EstadoPedidoApi;
  fechaHora: string;
}

export interface ApiPedido {
  id: number;
  tipo: TipoPedidoApi;
  estado: EstadoPedidoApi;
  direccionEntrega: string | null;
  fechaHora: string;
  totalSinIva: number;
  ivaTotal: number;
  total: number;
  cliente: { id: number; nombre: string; correo: string } | null;
  mesa: { id: number; numero: number } | null;
  detalles: ApiDetalle[];
  historial?: ApiHistorialEstado[];
}

export interface ApiStaff {
  id: number;
  nombre: string;
  correo: string;
  rol: RolStaff;
  estado: EstadoStaff;
}

export interface ApiCliente {
  id: number;
  nombre: string;
  correo: string;
  estado: EstadoCliente;
  fechaRegistro: string;
}

export interface ApiIngrediente {
  id: number;
  nombre: string;
  unidadCompra: string;
  gramosPorUnidad: number | string;
  stockUnidades: number | string;
  stockMinimoPorciones: number;
  eliminable: boolean;
  platoIngredientes: {
    id: number;
    gramosPorPorcion: number | string;
    plato: { id: number; nombre: string };
  }[];
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export function fetchPedidos(estado?: EstadoPedidoApi): Promise<ApiPedido[]> {
  const qs = estado ? `?estado=${estado}` : '';
  return apiFetch<ApiPedido[]>(`/pedidos${qs}`);
}

export function cambiarEstadoPedido(
  id: number,
  estado: EstadoPedidoApi,
  staffId?: number,
): Promise<ApiPedido> {
  return apiFetch<ApiPedido>(`/pedidos/${id}/estado`, {
    method: 'PATCH',
    body: { estado, staffId },
  });
}

export function cancelarPedido(id: number): Promise<ApiPedido> {
  return apiFetch<ApiPedido>(`/pedidos/${id}/cancelar`, { method: 'PATCH' });
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

export function fetchStaff(): Promise<ApiStaff[]> {
  return apiFetch<ApiStaff[]>('/auth/staff');
}

export function fetchClientes(): Promise<ApiCliente[]> {
  return apiFetch<ApiCliente[]>('/auth/clientes');
}

export function createStaff(body: {
  nombre: string; correo: string; contrasena: string; rol: RolStaff;
}): Promise<ApiStaff> {
  return apiFetch<ApiStaff>('/auth/staff', { method: 'POST', body });
}

export function updateStaff(
  id: number,
  body: { nombre?: string; rol?: RolStaff; estado?: EstadoStaff; contrasena?: string },
): Promise<ApiStaff> {
  return apiFetch<ApiStaff>(`/auth/staff/${id}`, { method: 'PATCH', body });
}

export function deleteStaff(id: number): Promise<void> {
  return apiFetch(`/auth/staff/${id}`, { method: 'DELETE' });
}

export function updateEstadoCliente(id: number, estado: EstadoCliente): Promise<ApiCliente> {
  return apiFetch<ApiCliente>(`/auth/clientes/${id}/estado`, {
    method: 'PATCH',
    body: { estado },
  });
}

// ── Ingredientes ──────────────────────────────────────────────────────────────

export function fetchIngredientes(): Promise<ApiIngrediente[]> {
  return apiFetch<ApiIngrediente[]>('/menu/ingredientes');
}

export function createIngrediente(body: {
  nombre: string; unidadCompra: string; gramosPorUnidad: number;
  stockUnidades: number; stockMinimoPorciones: number; eliminable: boolean;
}): Promise<ApiIngrediente> {
  return apiFetch<ApiIngrediente>('/menu/ingredientes', { method: 'POST', body });
}

export function updateIngrediente(
  id: number,
  body: Partial<{
    nombre: string; unidadCompra: string; gramosPorUnidad: number;
    stockUnidades: number; stockMinimoPorciones: number; eliminable: boolean;
  }>,
): Promise<ApiIngrediente> {
  return apiFetch<ApiIngrediente>(`/menu/ingredientes/${id}`, { method: 'PATCH', body });
}

export function deleteIngrediente(id: number): Promise<void> {
  return apiFetch(`/menu/ingredientes/${id}`, { method: 'DELETE' });
}

export function upsertPlatoIngrediente(
  platoId: number,
  body: { ingredienteId: number; gramosPorPorcion: number },
): Promise<void> {
  return apiFetch(`/menu/platos/${platoId}/ingredientes`, { method: 'POST', body });
}

export function deletePlatoIngrediente(platoId: number, ingredienteId: number): Promise<void> {
  return apiFetch(`/menu/platos/${platoId}/ingredientes/${ingredienteId}`, { method: 'DELETE' });
}

// ── Mesas ─────────────────────────────────────────────────────────────────────

export type EstadoMesa = 'libre' | 'ocupada' | 'reservada';

export interface ApiMesa {
  id: number;
  numero: number;
  estado: EstadoMesa;
  qrUrl: string | null;
}

export function fetchMesasAdmin(): Promise<ApiMesa[]> {
  return apiFetch<ApiMesa[]>('/pedidos/mesas/todas');
}

export function createMesa(numero: number): Promise<ApiMesa> {
  return apiFetch<ApiMesa>('/pedidos/mesas', { method: 'POST', body: { numero } });
}

export function updateMesaAdmin(
  id: number,
  data: Partial<{ numero: number; estado: EstadoMesa; qrUrl: string }>,
): Promise<ApiMesa> {
  return apiFetch<ApiMesa>(`/pedidos/mesas/${id}`, { method: 'PATCH', body: data });
}

export function deleteMesa(id: number): Promise<void> {
  return apiFetch(`/pedidos/mesas/${id}`, { method: 'DELETE' });
}

// ── Stats para dashboard ──────────────────────────────────────────────────────

export async function fetchDashboardStats() {
  const [pedidos, staff, clientes] = await Promise.all([
    fetchPedidos(),
    fetchStaff(),
    fetchClientes(),
  ]);

  const hoy = new Date().toDateString();
  const pedidosHoy = pedidos.filter(
    (p) => new Date(p.fechaHora).toDateString() === hoy,
  );
  const ingresosHoy = pedidosHoy
    .filter((p) => p.estado !== 'cancelado')
    .reduce((s, p) => s + Number(p.total), 0);

  return {
    pedidosHoy: pedidosHoy.length,
    ingresosHoy,
    totalUsuarios: staff.length + clientes.length,
    pedidosActivos: pedidos.filter(
      (p) => p.estado === 'pendiente' || p.estado === 'en_cocina',
    ).length,
  };
}