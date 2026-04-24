import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateIngredienteDto {
  @IsString()
  @Length(1, 100)
  nombre: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
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
