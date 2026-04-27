/**
 * useOrderTracking.ts
 * Suscribe a cambios en tiempo real del pedido usando Supabase Realtime.
 * Requiere que la tabla `pedidos` tenga Realtime habilitado en Supabase Dashboard:
 *   Database → Replication → supabase_realtime → pedidos ✓
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { clearIfTerminal } from '@/shared/lib/guestSession';

export type EstadoPedido =
  | 'pendiente'
  | 'en_cocina'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface TrackingData {
  id: number;
  estado: EstadoPedido;
  tipo: 'mesa' | 'domicilio' | 'llevar';
  total: number;
  fechaHora: string;
  items: { nombre: string; cantidad: number }[];
  historial: { estado: EstadoPedido; fechaHora: string }[];
}

interface UseOrderTrackingResult {
  data: TrackingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_URL = import.meta.env.VITE_API_URL as string;

export function useOrderTracking(pedidoId: number | null): UseOrderTrackingResult {
  const [data, setData]       = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const channelRef            = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = useCallback(async () => {
    if (!pedidoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch(`${API_URL}/pedidos/${pedidoId}/tracking`);
      if (!res.ok) throw new Error('Pedido no encontrado');
      const json = await res.json() as TrackingData;
      setData(json);
      clearIfTerminal(json.estado);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  }, [pedidoId]);

  // Carga inicial
  useEffect(() => {
    if (!pedidoId) { setData(null); return; }
    fetch();
  }, [pedidoId, fetch]);

  // Suscripción Supabase Realtime al estado del pedido
  useEffect(() => {
    if (!pedidoId) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`pedido-tracking-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${pedidoId}`,
        },
        (payload) => {
          const nuevo = payload.new as { estado: EstadoPedido };
          // Refetch completo para tener historial actualizado
          fetch();
          // Limpia localStorage si terminó
          clearIfTerminal(nuevo.estado);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [pedidoId, fetch]);

  return { data, loading, error, refetch: fetch };
}
