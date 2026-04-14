import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Plato } from './plato.entity';

@Entity('ingredientes')
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  /** true = el cliente puede pedir que se lo quiten */
  @Column({ default: true })
  eliminable: boolean;

  @ManyToOne(() => Plato, (p) => p.ingredientes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_plato' })
  plato: Plato;
}
