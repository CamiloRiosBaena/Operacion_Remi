import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Plato } from './plato.entity';

@Entity('extras')
export class Extra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @ManyToOne(() => Plato, (p) => p.extras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_plato' })
  plato: Plato;
}
