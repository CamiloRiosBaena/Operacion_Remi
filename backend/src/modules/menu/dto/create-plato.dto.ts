import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreatePlatoDto {
  @IsString()
  @Length(1, 100)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio: number;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  descripcion?: string;

  @IsString()
  @IsOptional()
  imagenUrl?: string;

  @IsBoolean()
  @IsOptional()
  disponible?: boolean;

  /** IVA como decimal: 0.19 = 19 %, 0 = exento */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  @IsOptional()
  tasaIva?: number;

  @IsInt()
  @IsPositive()
  categoriaId: number;
}
