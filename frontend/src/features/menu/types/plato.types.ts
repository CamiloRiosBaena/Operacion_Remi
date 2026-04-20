export interface PlatoExtra {
  nombre: string;
  precio: number;
}

export interface Plato {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  imageUrl?: string;
  ingredientes: string[];
  extras: PlatoExtra[];
}
