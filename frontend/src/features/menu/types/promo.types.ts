export type TipoDescuento = 'porcentaje' | '2x1' | 'monto_fijo';

export interface Promo {
  id: number;
  tag: string;
  titulo: string;
  subtitulo: string;
  cta: string;
  ctaAccion: 'plato' | 'categoria';
  ctaValor: string;
  colorFrom: string;
  colorTo: string;
  colorAcento: string;
  activo: boolean;
  orden: number;
  imageUrl?: string | null;
  tipoDescuento?: TipoDescuento | null;
  valorDescuento?: number | null;
}

/** Etiqueta legible para cada tipo de descuento */
export const TIPO_DESCUENTO_LABEL: Record<TipoDescuento, string> = {
  porcentaje:  '% Porcentaje',
  '2x1':       '2×1 (paga 1 lleva 2)',
  monto_fijo:  '$ Monto fijo',
};

/** Calcula el descuento en pesos para un ítem del carrito */
export function calcularDescuento(
  promo: Promo,
  precioBase: number,
  cantidad: number,
): number {
  if (!promo.tipoDescuento) return 0;
  const subtotal = precioBase * cantidad;
  if (promo.tipoDescuento === 'porcentaje') {
    return subtotal * ((promo.valorDescuento ?? 0) / 100);
  }
  if (promo.tipoDescuento === '2x1') {
    return precioBase * Math.floor(cantidad / 2);
  }
  if (promo.tipoDescuento === 'monto_fijo') {
    return Math.min(promo.valorDescuento ?? 0, subtotal);
  }
  return 0;
}
