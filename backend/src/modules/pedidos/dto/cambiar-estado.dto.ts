import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { EstadoPedido } from '../entities/pedido.entity';

export class CambiarEstadoDto {
  @IsEnum(EstadoPedido)
  estado: EstadoPedido;

  /** ID del usuario staff que realiza el cambio (opcional para auditoría) */
  @IsInt()
  @IsPositive()
  @IsOptional()
  staffId?: number;
}
