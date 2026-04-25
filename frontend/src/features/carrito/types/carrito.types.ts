export interface CartExtra {
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface CartItem {
  platoId: number;
  nombre: string;
  precio: number;
  tasaIva?: number;
  cantidad: number;
  emoji?: string;
  categoria: string;
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
  addItem: (item: Omit<CartItem, 'cantidad'>) => void;
  removeItem: (platoId: number) => void;
  updateCantidad: (platoId: number, cantidad: number) => void;
  clearCart: () => void;
}
