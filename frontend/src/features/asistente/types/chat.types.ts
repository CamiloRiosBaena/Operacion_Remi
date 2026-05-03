export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface CartAction {
  platoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  tasaIva: number;
  categoria: string;
  imageUrl?: string;
  extras?: { nombre: string; precio: number; cantidad: number }[];
  ingredientesRemovidos?: string[];
  nota?: string;
}

export interface ChatResponse {
  mensaje: string;
  cartActions: CartAction[];
}
