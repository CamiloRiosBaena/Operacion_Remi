import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Plato } from './plato.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  nombre: string;

  @OneToMany(() => Plato, (p) => p.categoria)
  platos: Plato[];
}
