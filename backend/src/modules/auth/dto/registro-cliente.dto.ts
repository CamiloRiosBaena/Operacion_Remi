import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegistroClienteDto {
  @IsString()
  @Length(1, 100)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  contrasena: string;
}
