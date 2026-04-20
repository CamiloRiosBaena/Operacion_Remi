import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Plato } from './plato.entity';
import { Ingrediente } from './ingrediente.entity';

/**
 * Tabla intermedia que relaciona un plato con sus ingredientes
 * e indica cuántos gramos de ese ingrediente usa una porción del plato.
 *
 * Conversión:
 *   gramos disponibles  =  Ingrediente.stockUnidades × Ingrediente.gramosPorUnidad
 *   porciones posibles  =  floor(gramos_disponibles / gramosPorPorcion)
 */
@Entity('plato_ingredientes')
export class PlatoIngrediente {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Gramos del ingrediente que consume una porción de este plato.
   * Ej: la Bandeja Paisa usa 200 g de fríjoles.
   */
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  gramosPorPorcion: number;

  @ManyToOne(() => Plato, (p) => p.platoIngredientes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_plato' })
  plato: Plato;

  @ManyToOne(() => Ingrediente, (i) => i.platoIngredientes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_ingrediente' })
  ingrediente: Ingrediente;
}
