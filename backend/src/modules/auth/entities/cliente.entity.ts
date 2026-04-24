import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SesionCliente } from './sesion-cliente.entity';
import { Pedido } from '../../pedidos/entities/pedido.entity';

export enum EstadoCliente {
  ACTIVO   = 'activo',
  INACTIVO = 'inactivo',
  BANEADO  = 'baneado',
}

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36, unique: true })
  supabase_uid: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100, unique: true })
  correo: string;

  @Column({ type: 'enum', enum: EstadoCliente, default: EstadoCliente.ACTIVO })
  estado: EstadoCliente;

  @CreateDateColumn()
  fechaRegistro: Date;

  @OneToMany(() => SesionCliente, (s) => s.cliente)
  sesiones: SesionCliente[];

  @OneToMany(() => Pedido, (p) => p.cliente)
  pedidos: Pedido[];
}
