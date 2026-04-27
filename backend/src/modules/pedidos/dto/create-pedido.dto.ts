import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPedido } from '../entities/pedido.entity';

export class CreateDetalleDto {
  @IsInt()
  @IsPositive()
  platoId: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  /** JSON serializado con extras e ingredientes excluidos (opcional) */
  @IsString()
  @IsOptional()
  personalizacion?: string;
}

export class CreatePedidoDto {
  @IsEnum(TipoPedido)
  tipo: TipoPedido;

  @IsInt()
  @IsPositive()
  @IsOptional()
  clienteId?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  mesaId?: number;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  direccionEntrega?: string;

  /** Token de sesión invitado (para vincular el pedido y poder enviar notificaciones) */
  @IsString()
  @IsOptional()
  tokenSesion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleDto)
  detalles: CreateDetalleDto[];
}
