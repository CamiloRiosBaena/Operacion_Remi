import { IsString, Length } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @Length(1, 50)
  nombre: string;
}
