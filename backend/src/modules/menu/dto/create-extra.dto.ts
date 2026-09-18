import { IsInt, IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class CreateExtraDto {
  @IsString()
  @Length(5, 30)
  nombre: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio: number;

  @IsInt()
  @IsPositive()
  platoId: number;
}
