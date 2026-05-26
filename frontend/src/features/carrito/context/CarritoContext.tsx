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

function makeKey(item: Omit<CartItem, 'cartItemKey' | 'cantidad'>): string {
  const removidos = [...(item.ingredientesRemovidos ?? [])].sort().join(',');
  const extras = (item.extras ?? [])
    .map((e) => `${e.nombre}:${e.cantidad}`)
    .sort()
    .join(',');
  return `${item.platoId}|${removidos}|${extras}|${item.nota ?? ''}`;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as CartItem[];
    // Migración: items guardados antes de cartItemKey no tendrán la clave
    return items.map((i) => ({ ...i, cartItemKey: i.cartItemKey ?? makeKey(i) }));
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

  // addItem: si ya existe un ítem con la misma clave (platoId + personalizaciones),
  // incrementa su cantidad; si no existe o la personalización es diferente, crea uno nuevo.
  const addItem = useCallback((raw: Omit<CartItem, 'cartItemKey'>) => {
    const key = makeKey(raw);
    const item: CartItem = { ...raw, cartItemKey: key };
    setItems((prev) => {
      const existing = prev.find((i) => i.cartItemKey === key);
      const next = existing
        ? prev.map((i) =>
            i.cartItemKey === key
              ? { ...i, cantidad: i.cantidad + raw.cantidad }
              : i,
          )
        : [...prev, item];
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((cartItemKey: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.cartItemKey !== cartItemKey);
      saveCart(next);
      return next;
    });
  }, []);

  const updateCantidad = useCallback((cartItemKey: string, cantidad: number) => {
    setItems((prev) => {
      const next =
        cantidad <= 0
          ? prev.filter((i) => i.cartItemKey !== cartItemKey)
          : prev.map((i) => (i.cartItemKey === cartItemKey ? { ...i, cantidad } : i));
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const { count, total, ivaTotal, totalConIva } = useMemo(
    () =>
      items.reduce(
        (acc, i) => {
          const base = itemTotal(i);
          const iva  = Math.round(base * (i.tasaIva ?? 0));
          return {
            count:       acc.count + i.cantidad,
            total:       acc.total + base,
            ivaTotal:    acc.ivaTotal + iva,
            totalConIva: acc.totalConIva + base + iva,
          };
        },
        { count: 0, total: 0, ivaTotal: 0, totalConIva: 0 },
      ),
    [items],
  );

  return (
    <CarritoContext.Provider
      value={{ items, count, total, ivaTotal, totalConIva, addItem, removeItem, updateCantidad, clearCart }}
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
