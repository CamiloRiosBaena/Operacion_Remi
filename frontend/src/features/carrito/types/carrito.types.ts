export interface CartExtra {
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface CartItem {
  platoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  emoji: string;
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
  /** Total en pesos (incluye precio base + extras) */
  total: number;
  addItem: (item: Omit<CartItem, 'cantidad'>) => void;
  removeItem: (platoId: number) => void;
  updateCantidad: (platoId: number, cantidad: number) => void;
  clearCart: () => void;
}
