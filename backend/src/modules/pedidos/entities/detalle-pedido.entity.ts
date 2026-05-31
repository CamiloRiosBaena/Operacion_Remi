import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Plato } from '../../menu/entities/plato.entity';
import { Pedido } from './pedido.entity';

@Entity('detalles_pedido')
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cantidad: number;

  /** JSON con extras activos e ingredientes removidos — almacenado como texto */
  @Column({ type: 'text', nullable: true })
  personalizacion: string | null;

  /** Precio base sin IVA × cantidad. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  /** IVA cobrado en esta línea (subtotal × tasaIva del plato al momento del pedido). */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  montoIva: number;

  /** Monto descontado en esta línea por aplicación de promo. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  descuento: number;

  @ManyToOne(() => Plato, (p) => p.detalles, { nullable: false })
  @JoinColumn({ name: 'id_plato' })
  plato: Plato;

  @ManyToOne(() => Pedido, (p) => p.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;
}
