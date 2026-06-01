import { useCallback, useRef, useState } from 'react';
import { useCarrito } from '@/features/carrito/context/CarritoContext';
import { chatWithAsistente } from '../services/asistente.service';
import type { CartAction, ChatMessage } from '../types/chat.types';

const BIENVENIDA: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content: '¡Hola! Soy Remi 👋 Puedo ayudarte a conocer el menú y agregar platos a tu pedido. ¿Qué se te antoja hoy?',
};

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([BIENVENIDA]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const carrito = useCarrito();
  const abortRef = useRef<AbortController | null>(null);

  const addToCart = useCallback(
    (action: CartAction) => {
      const item = {
        platoId: action.platoId,
        nombre: action.nombre,
        precio: Number(action.precio),   // garantiza number, no string
        cantidad: 1,                      // addItem acumula de 1 en 1
        tasaIva: Number(action.tasaIva ?? 0),
        categoria: action.categoria ?? '',
        imageUrl: action.imageUrl,
        extras: action.extras,
        ingredientesRemovidos: action.ingredientesRemovidos,
        nota: action.nota,
      };
      const veces = Math.max(1, action.cantidad ?? 1);
      for (let i = 0; i < veces; i++) {
        carrito.addItem(item);
      }
    },
    [carrito],
  );

  const sendMessage = useCallback(
    async (texto: string) => {
      if (!texto.trim() || loading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: texto.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        // Historial sin el mensaje de bienvenida del sistema
        const historial = [...messages.filter((m) => m.id !== 'init'), userMsg].map(
          ({ role, content }) => ({ role, content }),
        );

        const res = await chatWithAsistente(historial);

        const botMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.mensaje,
        };

        setMessages((prev) => [...prev, botMsg]);

        // Ejecutar acciones en el carrito
        for (const action of res.cartActions) {
          addToCart(action);
        }
      } catch (err: any) {
        setError(err.message ?? 'Error al contactar al asistente');
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Lo siento, hubo un problema al procesar tu mensaje. Intenta de nuevo.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, addToCart],
  );

  const reset = useCallback(() => {
    setMessages([BIENVENIDA]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, reset };
}
