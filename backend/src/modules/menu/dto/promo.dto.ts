import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class CreatePromoDto {
  @IsString() @MaxLength(100)
  tag: string;

  @IsString() @MaxLength(150)
  titulo: string;

  @IsString() @MaxLength(300)
  subtitulo: string;

  @IsString() @MaxLength(60)
  cta: string;

  @IsIn(['plato', 'categoria'])
  ctaAccion: string;

  @IsString() @MaxLength(100)
  ctaValor: string;

  @IsString() @Matches(HEX_COLOR)
  colorFrom: string;

  @IsString() @Matches(HEX_COLOR)
  colorTo: string;

  @IsString() @Matches(HEX_COLOR)
  colorAcento: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  orden?: number;

  @IsOptional() @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsIn(['porcentaje', '2x1', 'monto_fijo', null])
  tipoDescuento?: 'porcentaje' | '2x1' | 'monto_fijo' | null;

  /** Requerido cuando tipoDescuento es 'porcentaje' o 'monto_fijo'. */
  @ValidateIf((o) => o.tipoDescuento === 'porcentaje' || o.tipoDescuento === 'monto_fijo')
  @IsNumber() @Min(0)
  valorDescuento?: number | null;
}

export class UpdatePromoDto {
  @IsOptional() @IsString() @MaxLength(100)
  tag?: string;

  @IsOptional() @IsString() @MaxLength(150)
  titulo?: string;

  @IsOptional() @IsString() @MaxLength(300)
  subtitulo?: string;

  @IsOptional() @IsString() @MaxLength(60)
  cta?: string;

  @IsOptional() @IsIn(['plato', 'categoria'])
  ctaAccion?: string;

  @IsOptional() @IsString() @MaxLength(100)
  ctaValor?: string;

  @IsOptional() @IsString() @Matches(HEX_COLOR)
  colorFrom?: string;

  @IsOptional() @IsString() @Matches(HEX_COLOR)
  colorTo?: string;

  @IsOptional() @IsString() @Matches(HEX_COLOR)
  colorAcento?: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  orden?: number;

  @IsOptional() @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsIn(['porcentaje', '2x1', 'monto_fijo', null])
  tipoDescuento?: 'porcentaje' | '2x1' | 'monto_fijo' | null;

  @IsOptional()
  @IsNumber() @Min(0)
  valorDescuento?: number | null;
}
