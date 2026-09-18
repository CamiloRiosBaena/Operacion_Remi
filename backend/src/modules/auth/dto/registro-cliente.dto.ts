import { IsEmail, IsString, Length } from 'class-validator';

export class RegistroClienteDto {
  @IsString()
  @Length(10, 30)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @Length(8, 20)
  contrasena: string;
}
