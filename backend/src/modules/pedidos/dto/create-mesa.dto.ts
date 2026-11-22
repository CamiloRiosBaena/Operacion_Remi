import { IsInt, IsPositive } from 'class-validator';

export class CreateMesaDto {
  @IsInt({ message: 'El número de mesa debe ser un entero' })
  @IsPositive({ message: 'El número de mesa debe ser mayor que 0' })
  numero: number;
}
