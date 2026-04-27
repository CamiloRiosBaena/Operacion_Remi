/**
 * usePushNotifications.ts
 * Maneja el registro del Service Worker y la suscripción Web Push.
 */

import { useCallback, useEffect, useState } from 'react';
import { getGuestToken } from '@/shared/lib/guestSession';

const API_URL     = import.meta.env.VITE_API_URL as string;
const VAPID_KEY   = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushResult {
  permission: PermissionStatus;
  requestPush: () => Promise<boolean>;
  swReady: boolean;
}

export function usePushNotifications(): UsePushResult {
  const [permission, setPermission] = useState<PermissionStatus>('default');
  const [swReady, setSwReady]       = useState(false);

  // Registrar el service worker al montar
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => setSwReady(true))
      .catch((err) => console.warn('[SW] Error registrando service worker:', err));

    // Sincronizar estado de permiso
    setPermission(Notification.permission as PermissionStatus);
  }, []);

  const requestPush = useCallback(async (): Promise<boolean> => {
    if (!swReady || !VAPID_KEY) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionStatus);
      if (perm !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;
      const suscripcion  = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });

      const tokenSesion = getGuestToken();
      if (!tokenSesion) return false;

      await fetch(`${API_URL}/auth/sesiones/push`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenSesion, suscripcion: suscripcion.toJSON() }),
      });

      return true;
    } catch (err) {
      console.warn('[Push] Error al suscribirse:', err);
      return false;
    }
  }, [swReady]);

  return { permission, requestPush, swReady };
}
