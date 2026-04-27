import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPedido } from '../../pedidos/entities/pedido.entity';

export class DetalleGenerarDto {
  @IsInt() @IsPositive()
  platoId: number;

  @IsInt() @Min(1)
  cantidad: number;

  @IsString() @IsOptional()
  personalizacion?: string;
}

export class GenerarPagoDto {
  @IsEnum(TipoPedido)
  tipo: TipoPedido;

  @IsInt() @IsPositive() @IsOptional()
  clienteId?: number;

  @IsInt() @IsPositive() @IsOptional()
  mesaId?: number;

  @IsString() @IsOptional() @Length(1, 100)
  direccionEntrega?: string;

  @IsString() @IsOptional()
  tokenSesion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleGenerarDto)
  detalles: DetalleGenerarDto[];
}
