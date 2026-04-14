import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pedido } from './pedido.entity';

export enum EstadoPago {
  PENDIENTE  = 'pendiente',
  APROBADO   = 'aprobado',
  RECHAZADO  = 'rechazado',
  REEMBOLSADO = 'reembolsado',
}

export enum MetodoPago {
  TARJETA    = 'tarjeta',
  NEQUI      = 'nequi',
  PSE        = 'pse',
  EFECTIVO   = 'efectivo',
  DAVIPLATA  = 'daviplata',
}

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  estado: EstadoPago;

  @Column({ type: 'enum', enum: MetodoPago, nullable: true })
  metodo: MetodoPago | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia: string | null;

  @CreateDateColumn()
  fechaHora: Date;

  @ManyToOne(() => Pedido, (p) => p.pagos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;
}
