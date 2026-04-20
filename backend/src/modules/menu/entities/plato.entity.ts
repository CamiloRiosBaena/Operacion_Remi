import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { PlatoIngrediente } from './plato-ingrediente.entity';
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

  /** Tasa de IVA aplicable. 0.19 = 19 %, 0 = exento. */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.19 })
  tasaIva: number;

  @ManyToOne(() => Categoria, (c) => c.platos, { nullable: false })
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;

  @OneToMany(() => PlatoIngrediente, (pi) => pi.plato, { cascade: true })
  platoIngredientes: PlatoIngrediente[];

  @OneToMany(() => Extra, (e) => e.plato, { cascade: true })
  extras: Extra[];

  @OneToMany(() => DetallePedido, (d) => d.plato)
  detalles: DetallePedido[];
}
