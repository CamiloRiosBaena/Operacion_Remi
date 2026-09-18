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

const UNIDADES_COMPRA = ['Kg', 'Caja', 'Bulto'] as const;

export class CreateIngredienteDto {
  @IsString()
  @Length(5, 50)
  nombre: string;

  @IsOptional()
  @IsIn(UNIDADES_COMPRA)
  unidadCompra?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  gramosPorUnidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  stockUnidades?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stockMinimoPorciones?: number;

  @IsBoolean()
  @IsOptional()
  eliminable?: boolean;
}
