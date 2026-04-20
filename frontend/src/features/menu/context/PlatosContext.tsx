import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Plato } from '../types/plato.types';

// ── Datos por defecto ────────────────────────────────────────────────────────
const PLATOS_DEFAULT: Plato[] = [
  {
    id: 1,
    nombre: 'Bandeja Paisa',
    descripcion: 'El plato emblema de Colombia. Frijoles rojos, arroz, carne molida, chicharrón crujiente, huevo frito, aguacate cremoso y arepa.',
    precio: 28000,
    categoria: 'Platos fuertes',
    disponible: true,
    ingredientes: ['Frijoles rojos', 'Arroz', 'Carne molida', 'Chicharrón', 'Huevo frito', 'Aguacate', 'Arepa'],
    extras: [
      { nombre: 'Extra chicharrón', precio: 3000 },
      { nombre: 'Extra aguacate',   precio: 2000 },
      { nombre: 'Salsa hogao',      precio: 1000 },
    ],
  },
  {
    id: 2,
    nombre: 'Ajiaco Bogotano',
    descripcion: 'Sopa espesa con pollo desmenuzado, tres tipos de papa, mazorca y guascas. Con crema de leche y alcaparras.',
    precio: 22000,
    categoria: 'Platos fuertes',
    disponible: true,
    ingredientes: ['Pollo', 'Papa criolla', 'Papa pastusa', 'Mazorca', 'Guascas', 'Crema de leche', 'Alcaparras'],
    extras: [
      { nombre: 'Extra pollo', precio: 4000 },
      { nombre: 'Extra crema', precio: 1000 },
    ],
  },
  {
    id: 3,
    nombre: 'Empanadas (x3)',
    descripcion: 'Tres empanadas de pipián fritas y doradas. Rellenas de papa con maní y ají amarillo. Con ají casero.',
    precio: 9000,
    categoria: 'Entradas',
    disponible: true,
    ingredientes: ['Masa de maíz', 'Papa', 'Maní', 'Ají amarillo', 'Cebolla'],
    extras: [
      { nombre: 'Ají extra',      precio: 500  },
      { nombre: 'Empanada extra', precio: 3000 },
    ],
  },
  {
    id: 4,
    nombre: 'Jugo de Lulo',
    descripcion: 'Jugo natural de lulo colombiano preparado al momento. En agua o leche. Disponible sin azúcar.',
    precio: 5000,
    categoria: 'Bebidas',
    disponible: true,
    ingredientes: ['Lulo', 'Agua', 'Azúcar'],
    extras: [{ nombre: 'En leche', precio: 1000 }],
  },
  {
    id: 5,
    nombre: 'Sancocho de Gallina',
    descripcion: 'Caldo tradicional con gallina criolla, papa, yuca, plátano y mazorca.',
    precio: 25000,
    categoria: 'Platos fuertes',
    disponible: false,
    ingredientes: ['Gallina criolla', 'Papa', 'Yuca', 'Plátano', 'Mazorca', 'Cilantro'],
    extras: [],
  },
  {
    id: 6,
    nombre: 'Patacones con Hogao',
    descripcion: 'Patacones de plátano verde dos veces fritos, con hogao casero y queso costeño.',
    precio: 8000,
    categoria: 'Entradas',
    disponible: true,
    ingredientes: ['Plátano verde', 'Hogao', 'Queso costeño', 'Sal'],
    extras: [
      { nombre: 'Extra hogao',      precio: 1000 },
      { nombre: 'Guacamole casero', precio: 2500 },
      { nombre: 'Suero costeño',    precio: 1500 },
    ],
  },
  {
    id: 7,
    nombre: 'Agua Panela con Limón',
    descripcion: 'Bebida tradicional con panela de caña y zumo de limón. Dulce y reconfortante.',
    precio: 3500,
    categoria: 'Bebidas',
    disponible: true,
    ingredientes: ['Panela', 'Agua', 'Limón'],
    extras: [{ nombre: 'Extra panela', precio: 500 }],
  },
  {
    id: 8,
    nombre: 'Arroz con Leche',
    descripcion: 'Postre cremoso de arroz con leche condensada, canela en rama y clavo.',
    precio: 6000,
    categoria: 'Postres',
    disponible: true,
    ingredientes: ['Arroz', 'Leche', 'Leche condensada', 'Canela', 'Clavo'],
    extras: [
      { nombre: 'Arequipe encima', precio: 1500 },
      { nombre: 'Coco rallado',   precio: 1000 },
    ],
  },
];

// ── Persistencia ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'remi_platos';

function loadPlatos(): Plato[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return PLATOS_DEFAULT;
    const parsed = JSON.parse(raw) as Plato[];
    // Si el storage tiene menos platos que el default (se añadieron nuevos),
    // fusionar: los del storage tienen prioridad (pueden tener imágenes).
    if (parsed.length < PLATOS_DEFAULT.length) {
      const ids = new Set(parsed.map((p) => p.id));
      return [...parsed, ...PLATOS_DEFAULT.filter((p) => !ids.has(p.id))];
    }
    return parsed;
  } catch {
    return PLATOS_DEFAULT;
  }
}

function savePlatos(platos: Plato[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(platos));
}

// ── Context ──────────────────────────────────────────────────────────────────
interface PlatosContextValue {
  platos: Plato[];
  upsertPlato: (plato: Plato) => void;
  deletePlato: (id: number) => void;
  toggleDisponible: (id: number) => void;
}

const PlatosContext = createContext<PlatosContextValue | null>(null);

export function PlatosProvider({ children }: { children: ReactNode }) {
  const [platos, setPlatos] = useState<Plato[]>(loadPlatos);

  const update = useCallback((next: Plato[]) => {
    setPlatos(next);
    savePlatos(next);
  }, []);

  const upsertPlato = useCallback((plato: Plato) => {
    setPlatos((prev) => {
      const exists = prev.some((p) => p.id === plato.id);
      const next = exists
        ? prev.map((p) => (p.id === plato.id ? plato : p))
        : [...prev, plato];
      savePlatos(next);
      return next;
    });
  }, []);

  const deletePlato = useCallback((id: number) => {
    setPlatos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePlatos(next);
      return next;
    });
  }, []);

  const toggleDisponible = useCallback((id: number) => {
    setPlatos((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, disponible: !p.disponible } : p,
      );
      savePlatos(next);
      return next;
    });
  }, []);

  return (
    <PlatosContext.Provider value={{ platos, upsertPlato, deletePlato, toggleDisponible }}>
      {children}
    </PlatosContext.Provider>
  );
}

export function usePlatos(): PlatosContextValue {
  const ctx = useContext(PlatosContext);
  if (!ctx) throw new Error('usePlatos debe usarse dentro de PlatosProvider');
  return ctx;
}
