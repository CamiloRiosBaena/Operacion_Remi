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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @ManyToOne(() => Plato, (p) => p.detalles, { nullable: false })
  @JoinColumn({ name: 'id_plato' })
  plato: Plato;

  @ManyToOne(() => Pedido, (p) => p.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;
}
