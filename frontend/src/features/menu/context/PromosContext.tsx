import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchActivePromos } from '../services/promo.service';
import type { Promo } from '../types/promo.types';

interface PromosContextValue {
  promos: Promo[];
  loading: boolean;
}

const PromosContext = createContext<PromosContextValue | null>(null);

export function PromosProvider({ children }: { children: ReactNode }) {
  const [promos, setPromos]   = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePromos()
      .then(setPromos)
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PromosContext.Provider value={{ promos, loading }}>
      {children}
    </PromosContext.Provider>
  );
}

export function usePromos(): PromosContextValue {
  const ctx = useContext(PromosContext);
  if (!ctx) throw new Error('usePromos debe usarse dentro de PromosProvider');
  return ctx;
}
