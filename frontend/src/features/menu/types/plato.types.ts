export interface PlatoExtra {
  id?: number;
  nombre: string;
  precio: number;
}

export interface Plato {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tasaIva: number;
  categoria: string;
  categoriaId?: number;
  disponible: boolean;
  imageUrl?: string;
  ingredientes: string[];
  extras: PlatoExtra[];
}
