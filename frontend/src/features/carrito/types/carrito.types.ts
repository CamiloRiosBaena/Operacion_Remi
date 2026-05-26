export interface CartExtra {
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface CartItem {
  /** Clave única: platoId + personalizaciones. Generada en el contexto. */
  cartItemKey: string;
  platoId: number;
  nombre: string;
  precio: number;
  tasaIva?: number;
  cantidad: number;
  emoji?: string;
  categoria: string;
  imageUrl?: string;
  // Personalizaciones
  ingredientesRemovidos?: string[];
  extras?: CartExtra[];
  nota?: string;
}

export interface CarritoContextValue {
  items: CartItem[];
  /** Número total de unidades en el carrito */
  count: number;
  /** Subtotal sin IVA */
  total: number;
  /** Monto de IVA acumulado */
  ivaTotal: number;
  /** Total final con IVA incluido */
  totalConIva: number;
  addItem: (item: Omit<CartItem, 'cartItemKey'>) => void;
  removeItem: (cartItemKey: string) => void;
  updateCantidad: (cartItemKey: string, cantidad: number) => void;
  clearCart: () => void;
}
