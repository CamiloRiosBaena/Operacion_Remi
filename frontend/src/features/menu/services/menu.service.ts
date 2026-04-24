import { apiFetch } from '@/shared/lib/api';
import type { Plato, PlatoExtra } from '../types/plato.types';

// ── Tipos que devuelve el backend ─────────────────────────────────────────────

export interface ApiCategoria {
  id: number;
  nombre: string;
}

interface ApiExtra {
  id: number;
  nombre: string;
  precio: number | string;
}

interface ApiPlatoIngrediente {
  id: number;
  gramosPorPorcion: number | string;
  ingrediente: { id: number; nombre: string };
}

export interface ApiPlato {
  id: number;
  nombre: string;
  precio: number | string;
  descripcion: string | null;
  imagenUrl: string | null;
  disponible: boolean;
  tasaIva: number | string;
  categoria: ApiCategoria;
  extras: ApiExtra[];
  platoIngredientes: ApiPlatoIngrediente[];
}

// ── Mapper API → frontend ─────────────────────────────────────────────────────

export function mapApiPlato(ap: ApiPlato): Plato {
  return {
    id: ap.id,
    nombre: ap.nombre,
    precio: Number(ap.precio),
    descripcion: ap.descripcion ?? '',
    categoria: ap.categoria?.nombre ?? '',
    categoriaId: ap.categoria?.id,
    disponible: ap.disponible,
    imageUrl: ap.imagenUrl ?? undefined,
    ingredientes: (ap.platoIngredientes ?? []).map((pi) => pi.ingrediente.nombre),
    extras: (ap.extras ?? []).map((e): PlatoExtra => ({
      id: e.id,
      nombre: e.nombre,
      precio: Number(e.precio),
    })),
  };
}

// ── Llamadas a la API ─────────────────────────────────────────────────────────

export async function fetchPlatos(): Promise<Plato[]> {
  const data = await apiFetch<ApiPlato[]>('/menu/platos');
  return data.map(mapApiPlato);
}

export async function fetchCategorias(): Promise<ApiCategoria[]> {
  return apiFetch<ApiCategoria[]>('/menu/categorias');
}

export async function createPlato(body: {
  nombre: string;
  precio: number;
  descripcion?: string;
  imagenUrl?: string;
  disponible?: boolean;
  tasaIva?: number;
  categoriaId: number;
}): Promise<Plato> {
  const data = await apiFetch<ApiPlato>('/menu/platos', { method: 'POST', body });
  return mapApiPlato(data);
}

export async function updatePlato(
  id: number,
  body: Partial<{
    nombre: string;
    precio: number;
    descripcion: string;
    imagenUrl: string | null;
    disponible: boolean;
    categoriaId: number;
  }>,
): Promise<Plato> {
  const data = await apiFetch<ApiPlato>(`/menu/platos/${id}`, { method: 'PATCH', body });
  return mapApiPlato(data);
}

export async function toggleDisponibleApi(id: number): Promise<Plato> {
  const data = await apiFetch<ApiPlato>(`/menu/platos/${id}/disponibilidad`, { method: 'PATCH' });
  return mapApiPlato(data);
}

export async function deletePlatoApi(id: number): Promise<void> {
  await apiFetch(`/menu/platos/${id}`, { method: 'DELETE' });
}

export async function createCategoria(nombre: string): Promise<ApiCategoria> {
  return apiFetch<ApiCategoria>('/menu/categorias', { method: 'POST', body: { nombre } });
}
