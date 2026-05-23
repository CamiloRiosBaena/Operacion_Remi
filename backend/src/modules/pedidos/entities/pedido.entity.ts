import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../../auth/entities/cliente.entity';
import { Mesa } from '../../mesas/entities/mesa.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Pago } from './pago.entity';
import { HistorialEstado } from './historial-estado.entity';
import { TokenQr } from './token-qr.entity';

export enum TipoPedido {
  MESA       = 'mesa',
  DOMICILIO  = 'domicilio',
  PARA_LLEVAR = 'llevar',
}

export enum EstadoPedido {
  PENDIENTE   = 'pendiente',
  EN_COCINA   = 'en_cocina',
  LISTO       = 'listo',
  EN_CAMINO   = 'en_camino',
  ENTREGADO   = 'entregado',
  CANCELADO   = 'cancelado',
}

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoPedido })
  tipo: TipoPedido;

  @Column({ type: 'enum', enum: EstadoPedido, default: EstadoPedido.PENDIENTE })
  estado: EstadoPedido;

  @Column({ type: 'varchar', length: 100, nullable: true })
  direccionEntrega: string | null;

  /** Token de sesión invitado que creó este pedido. Usado para enviar push notifications. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  tokenSesion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fechaHora: Date;

  /** Suma de detalles.subtotal (base gravable sin IVA). */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSinIva: number;

  /** Suma de detalles.montoIva. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ivaTotal: number;

  /** totalSinIva + ivaTotal — lo que paga el cliente. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @ManyToOne(() => Cliente, (c) => c.pedidos, { nullable: true })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente | null;

  @ManyToOne(() => Mesa, (m) => m.pedidos, { nullable: true })
  @JoinColumn({ name: 'id_mesa' })
  mesa: Mesa | null;

  @OneToMany(() => DetallePedido, (d) => d.pedido, { cascade: true })
  detalles: DetallePedido[];

  @OneToMany(() => Pago, (p) => p.pedido)
  pagos: Pago[];

  @OneToMany(() => HistorialEstado, (h) => h.pedido, { cascade: true })
  historial: HistorialEstado[];

  @OneToMany(() => TokenQr, (t) => t.pedido)
  tokensQr: TokenQr[];

  /** Casillero físico asignado para pedidos locales (mesa / llevar). */
  @Column({ type: 'varchar', length: 1, nullable: true })
  casillero: 'X' | 'Y' | null;
}
