import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pedido } from './pedido.entity';
import { UserStaff } from '../../auth/entities/user-staff.entity';

@Entity('historial_estado')
export class HistorialEstado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  estado: string;

  @CreateDateColumn()
  fechaHora: Date;

  @ManyToOne(() => Pedido, (p) => p.historial, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;

  @ManyToOne(() => UserStaff, (u) => u.historialEstados, { nullable: true })
  @JoinColumn({ name: 'id_user_staff' })
  userStaff: UserStaff | null;
}
