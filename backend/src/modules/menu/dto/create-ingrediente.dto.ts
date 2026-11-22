import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';

export const UNIDADES_COMPRA = ['Kg', 'Caja', 'Bulto'] as const;

export class CreateIngredienteDto {
  @IsString({ message: 'El nombre es obligatorio' })
  @Length(5, 50, { message: 'El nombre debe tener entre 5 y 50 caracteres' })
  nombre: string;

  @IsOptional()
  @IsIn(UNIDADES_COMPRA, {
    message: 'La unidad de compra debe ser Kg, Caja o Bulto',
  })
  unidadCompra?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Los gramos por unidad deben ser un número' },
  )
  @IsPositive({ message: 'Los gramos por unidad deben ser mayores que 0' })
  gramosPorUnidad: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El stock actual debe ser un número' },
  )
  @Min(0, { message: 'El stock actual no puede ser negativo' })
  @IsOptional()
  stockUnidades?: number;

  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  @IsOptional()
  stockMinimoPorciones?: number;

  @IsBoolean({ message: 'El campo eliminable debe ser verdadero o falso' })
  @IsOptional()
  eliminable?: boolean;
}
