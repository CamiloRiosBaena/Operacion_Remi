import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Pedido } from '../../pedidos/entities/pedido.entity';

export enum EstadoMesa {
  LIBRE    = 'libre',
  OCUPADA  = 'ocupada',
  RESERVADA = 'reservada',
}

@Entity('mesas')
export class Mesa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: number;

  @Column({ type: 'enum', enum: EstadoMesa, default: EstadoMesa.LIBRE })
  estado: EstadoMesa;

  @Column({ type: 'varchar', length: 255, nullable: true })
  qrUrl: string | null;

  @OneToMany(() => Pedido, (p) => p.mesa)
  pedidos: Pedido[];
}
