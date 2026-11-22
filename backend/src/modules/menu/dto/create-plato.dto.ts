import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export const TASAS_IVA = [0, 0.05, 0.19];

export class CreatePlatoDto {
  @IsString({ message: 'El nombre es obligatorio' })
  @Length(10, 50, { message: 'El nombre debe tener entre 10 y 50 caracteres' })
  nombre: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo 2 decimales' },
  )
  @IsPositive({ message: 'El precio debe ser mayor que 0' })
  precio: number;

  @IsString({ message: 'La descripción debe ser texto' })
  @IsOptional()
  @Length(0, 200, { message: 'La descripción no puede superar 200 caracteres' })
  descripcion?: string;

  @IsString({ message: 'La URL de la imagen debe ser texto' })
  @IsOptional()
  imagenUrl?: string;

  @IsBoolean({ message: 'La disponibilidad debe ser verdadero o falso' })
  @IsOptional()
  disponible?: boolean;

  /** IVA como decimal: solo las tarifas de Colombia 0 (excluido), 0.05 y 0.19 */
  @IsIn(TASAS_IVA, { message: 'El IVA debe ser 0 %, 5 % o 19 %' })
  @IsOptional()
  tasaIva?: number;

  @IsInt({ message: 'La categoría es obligatoria' })
  @IsPositive({ message: 'La categoría no es válida' })
  categoriaId: number;
}
