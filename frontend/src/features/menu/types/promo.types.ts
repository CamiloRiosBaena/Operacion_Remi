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
}
