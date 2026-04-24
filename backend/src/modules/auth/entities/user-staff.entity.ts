import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { HistorialEstado } from '../../pedidos/entities/historial-estado.entity';

export enum RolStaff {
  ADMIN        = 'admin',
  COCINERO     = 'cocinero',
  DOMICILIARIO = 'domiciliario',
}

export enum EstadoStaff {
  ACTIVO   = 'activo',
  INACTIVO = 'inactivo',
}

@Entity('user_staff')
export class UserStaff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36, unique: true })
  supabase_uid: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100, unique: true })
  correo: string;

  @Column({ type: 'enum', enum: RolStaff })
  rol: RolStaff;

  @Column({ type: 'enum', enum: EstadoStaff, default: EstadoStaff.ACTIVO })
  estado: EstadoStaff;

  @OneToMany(() => HistorialEstado, (h) => h.userStaff)
  historialEstados: HistorialEstado[];
}
