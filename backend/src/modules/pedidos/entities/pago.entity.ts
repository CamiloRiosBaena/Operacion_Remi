import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pedido } from './pedido.entity';

export enum EstadoPago {
  PENDIENTE   = 'pendiente',
  APROBADO    = 'aprobado',
  RECHAZADO   = 'rechazado',
  REEMBOLSADO = 'reembolsado',
}

export enum MetodoPago {
  TARJETA   = 'tarjeta',
  NEQUI     = 'nequi',
  PSE       = 'pse',
  EFECTIVO  = 'efectivo',
  DAVIPLATA = 'daviplata',
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

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  referencia: string | null;


  @Column({ type: 'varchar', length: 100, nullable: true })
  gatewayTransaccionId: string | null;

  /**
   * JSON con los datos del carrito (CreatePedidoDto).
   * Se guarda al generar el pago; se usa para crear el pedido tras confirmar.
   */
  @Column({ type: 'text', nullable: true })
  datosPedido: string | null;

  @CreateDateColumn()
  fechaHora: Date;

  /**
   * Nullable: el pedido se crea DESPUÉS de confirmar el pago,
   * por lo que al crear el Pago todavía no existe.
   */
  @ManyToOne(() => Pedido, (p) => p.pagos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido | null;
}
