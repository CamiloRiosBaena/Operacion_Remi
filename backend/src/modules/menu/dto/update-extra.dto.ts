import { IsNumber, IsOptional, IsPositive, IsString, Length } from 'class-validator';

export class UpdateExtraDto {
  @IsString()
  @IsOptional()
  @Length(1, 100)
  nombre?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  precio?: number;
}
