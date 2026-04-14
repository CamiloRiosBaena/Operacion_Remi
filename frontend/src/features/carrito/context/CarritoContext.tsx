import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CarritoContextValue, CartItem } from '../types/carrito.types';

const CarritoContext = createContext<CarritoContextValue | null>(null);

const STORAGE_KEY = 'remi_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function itemTotal(item: CartItem): number {
  const extrasSum = (item.extras ?? []).reduce(
    (s, e) => s + e.precio * e.cantidad,
    0,
  );
  return (item.precio + extrasSum) * item.cantidad;
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  // addItem: si el plato ya existe, incrementa cantidad y reemplaza personalizaciones;
  // si no existe, lo agrega con cantidad 1.
  const addItem = useCallback((item: Omit<CartItem, 'cantidad'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.platoId === item.platoId);
      const next = existing
        ? prev.map((i) =>
            i.platoId === item.platoId
              ? {
                  ...item,
                  cantidad: i.cantidad + 1,
                }
              : i,
          )
        : [...prev, { ...item, cantidad: 1 }];
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((platoId: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.platoId !== platoId);
      saveCart(next);
      return next;
    });
  }, []);

  const updateCantidad = useCallback((platoId: number, cantidad: number) => {
    setItems((prev) => {
      const next =
        cantidad <= 0
          ? prev.filter((i) => i.platoId !== platoId)
          : prev.map((i) => (i.platoId === platoId ? { ...i, cantidad } : i));
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const { count, total } = useMemo(
    () =>
      items.reduce(
        (acc, i) => ({
          count: acc.count + i.cantidad,
          total: acc.total + itemTotal(i),
        }),
        { count: 0, total: 0 },
      ),
    [items],
  );

  return (
    <CarritoContext.Provider
      value={{ items, count, total, addItem, removeItem, updateCantidad, clearCart }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito(): CarritoContextValue {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error('useCarrito debe usarse dentro de CarritoProvider');
  return ctx;
}
