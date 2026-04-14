import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { Ingrediente } from './ingrediente.entity';
import { Extra } from './extra.entity';
import { DetallePedido } from '../../pedidos/entities/detalle-pedido.entity';

@Entity('platos')
export class Plato {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imagenUrl: string | null;

  @Column({ default: true })
  disponible: boolean;

  @ManyToOne(() => Categoria, (c) => c.platos, { nullable: false })
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @OneToMany(() => Ingrediente, (i) => i.plato, { cascade: true })
  ingredientes: Ingrediente[];

  @OneToMany(() => Extra, (e) => e.plato, { cascade: true })
  extras: Extra[];

  @OneToMany(() => DetallePedido, (d) => d.plato)
  detalles: DetallePedido[];
}
