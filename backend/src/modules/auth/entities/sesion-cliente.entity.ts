import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('sesiones_cliente')
export class SesionCliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  tokenSesion: string;

  @Column({ type: 'timestamp' })
  fechaExpiracion: Date;

  @Column({ length: 20 })
  plataforma: string; // 'web' | 'android' | 'ios'

  /** JSON stringificado de PushSubscription (endpoint + keys). text por el tamaño del endpoint. */
  @Column({ type: 'text', nullable: true })
  pushToken: string | null;

  @ManyToOne(() => Cliente, (c) => c.sesiones, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: Cliente | null;
}
