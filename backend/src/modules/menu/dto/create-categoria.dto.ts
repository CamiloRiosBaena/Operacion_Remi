import { IsString, Length } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  @Length(5, 50)
  nombre: string;
}
