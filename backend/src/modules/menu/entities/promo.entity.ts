import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('promos_banner')
export class Promo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  tag: string;

  @Column({ length: 150 })
  titulo: string;

  @Column({ length: 300 })
  subtitulo: string;

  @Column({ length: 60 })
  cta: string;

  /** 'plato' | 'categoria' */
  @Column({ type: 'varchar', length: 20 })
  ctaAccion: string;

  /** ID del plato (como string) o nombre de categoría */
  @Column({ type: 'varchar', length: 100 })
  ctaValor: string;

  @Column({ length: 7, default: '#1c1917' })
  colorFrom: string;

  @Column({ length: 7, default: '#292524' })
  colorTo: string;

  @Column({ length: 7, default: '#d4500a' })
  colorAcento: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: 0 })
  orden: number;

  @Column({ type: 'text', nullable: true, default: null })
  imageUrl: string | null;

  /** 'porcentaje' | '2x1' | 'monto_fijo' | null */
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  tipoDescuento: 'porcentaje' | '2x1' | 'monto_fijo' | null;

  /** Porcentaje (ej: 15) o monto fijo en pesos. Null para 2×1. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: null })
  valorDescuento: number | null;
}
