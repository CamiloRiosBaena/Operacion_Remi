import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Plato } from '../types/plato.types';
import {
  fetchPlatos,
  createPlato,
  updatePlato,
  deletePlatoApi,
  toggleDisponibleApi,
} from '../services/menu.service';

interface PlatosContextValue {
  platos: Plato[];
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  upsertPlato: (plato: Plato) => Promise<void>;
  deletePlato: (id: number) => Promise<void>;
  toggleDisponible: (id: number) => Promise<void>;
}

const PlatosContext = createContext<PlatosContextValue | null>(null);

export function PlatosProvider({ children }: { children: ReactNode }) {
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlatos();
      setPlatos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando platos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const upsertPlato = useCallback(async (plato: Plato) => {
    const esNuevo = plato.id === 0 || !platos.some((p) => p.id === plato.id);

    if (esNuevo) {
      const creado = await createPlato({
        nombre: plato.nombre,
        precio: plato.precio,
        descripcion: plato.descripcion,
        imagenUrl: plato.imageUrl,
        disponible: plato.disponible,
        tasaIva: plato.tasaIva,
        categoriaId: plato.categoriaId!,
      });
      setPlatos((prev) => [...prev, creado]);
    } else {
      const actualizado = await updatePlato(plato.id, {
        nombre: plato.nombre,
        precio: plato.precio,
        descripcion: plato.descripcion,
        imagenUrl: plato.imageUrl ?? null,
        disponible: plato.disponible,
        tasaIva: plato.tasaIva,
        categoriaId: plato.categoriaId,
      });
      setPlatos((prev) => prev.map((p) => (p.id === plato.id ? actualizado : p)));
    }
  }, [platos]);

  const deletePlato = useCallback(async (id: number) => {
    await deletePlatoApi(id);
    setPlatos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleDisponible = useCallback(async (id: number) => {
    const actualizado = await toggleDisponibleApi(id);
    setPlatos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
  }, []);

  return (
    <PlatosContext.Provider
      value={{ platos, loading, error, recargar: cargar, upsertPlato, deletePlato, toggleDisponible }}
    >
      {children}
    </PlatosContext.Provider>
  );
}

export function usePlatos(): PlatosContextValue {
  const ctx = useContext(PlatosContext);
  if (!ctx) throw new Error('usePlatos debe usarse dentro de PlatosProvider');
  return ctx;
}
