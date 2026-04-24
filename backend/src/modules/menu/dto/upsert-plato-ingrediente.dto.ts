import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class UpsertPlatoIngredienteDto {
  @IsInt()
  @IsPositive()
  ingredienteId: number;

  /** Gramos de este ingrediente que usa una porción del plato. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  gramosPorPorcion: number;
}
