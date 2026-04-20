import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PlatoIngrediente } from './plato-ingrediente.entity';

@Entity('ingredientes')
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  /**
   * Unidad con la que el gerente compra el ingrediente.
   * Ejemplos: 'bulto', 'caja', 'kg', 'litro', 'racimo', 'paca', 'unidad'
   */
  @Column({ length: 50, default: 'kg' })
  unidadCompra: string;

  /**
   * Cantidad de gramos que contiene una unidad de compra.
   * Ej: un bulto de 50 kg → 50000
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gramosPorUnidad: number;

  /**
   * Cuántas unidades hay actualmente en bodega.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockUnidades: number;

  /**
   * Se activa la alerta de "stock bajo" cuando las porciones posibles
   * (calculadas de gramos disponibles ÷ gramos por porción) caen por debajo de este umbral.
   */
  @Column({ type: 'int', default: 10 })
  stockMinimoPorciones: number;

  /** true = el cliente puede solicitar que se lo quiten del plato */
  @Column({ default: true })
  eliminable: boolean;

  @OneToMany(() => PlatoIngrediente, (pi) => pi.ingrediente, { cascade: true })
  platoIngredientes: PlatoIngrediente[];
}
