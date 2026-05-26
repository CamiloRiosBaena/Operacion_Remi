import { useEffect, useRef } from 'react';
import { supabase } from '@/shared/lib/supabase';

/**
 * Suscribe al canal Supabase Realtime de la tabla 'pedidos'.
 * Llama a `onCambio` en cada INSERT / UPDATE / DELETE.
 *
 * Si Realtime no está habilitado para la tabla, cae automáticamente
 * en polling cada `fallbackMs` ms (default 30 s) como respaldo.
 *
 * Requiere que Realtime esté activado en Supabase Dashboard:
 *   Database → Replication → habilitar tabla `pedidos`
 */
export function useRealtimePedidos(
  onCambio: () => void,
  fallbackMs = 30_000,
) {
  // Ref para que el closure del canal siempre use la versión más actual del callback
  const cbRef = useRef(onCambio);
  cbRef.current = onCambio;

  useEffect(() => {
    const channelId = `remi-pedidos-${Math.random().toString(36).slice(2, 9)}`;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => cbRef.current(),
      )
      .subscribe();

    // Fallback: si el canal no entrega eventos, al menos refresca cada fallbackMs
    const timer = setInterval(() => cbRef.current(), fallbackMs);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [fallbackMs]);
}
