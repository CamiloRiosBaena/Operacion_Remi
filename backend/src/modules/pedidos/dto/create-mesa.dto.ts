import { IsInt, IsPositive } from 'class-validator';

export class CreateMesaDto {
  @IsInt()
  @IsPositive()
  numero: number;
}
