import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pedido } from './pedido.entity';

@Entity('tokens_qr')
export class TokenQr {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  token: string;

  @Column({ type: 'timestamp' })
  expiracion: Date;

  @ManyToOne(() => Pedido, (p) => p.tokensQr, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;
}
