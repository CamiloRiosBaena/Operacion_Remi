import { apiFetch } from '@/shared/lib/api';
import type { Promo } from '../types/promo.types';

export type PromoPayload = Omit<Promo, 'id'>;

export const fetchActivePromos  = () => apiFetch<Promo[]>('/menu/promos');
export const fetchAllPromos     = () => apiFetch<Promo[]>('/menu/promos/todas');
export const createPromo        = (data: PromoPayload) => apiFetch<Promo>('/menu/promos', { method: 'POST', body: data });
export const updatePromo        = (id: number, data: Partial<PromoPayload>) => apiFetch<Promo>(`/menu/promos/${id}`, { method: 'PATCH', body: data });
export const deletePromo        = (id: number) => apiFetch<void>(`/menu/promos/${id}`, { method: 'DELETE' });
