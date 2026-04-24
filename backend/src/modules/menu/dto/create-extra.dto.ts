import { IsInt, IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class CreateExtraDto {
  @IsString()
  @Length(1, 100)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio: number;

  @IsInt()
  @IsPositive()
  platoId: number;
}
