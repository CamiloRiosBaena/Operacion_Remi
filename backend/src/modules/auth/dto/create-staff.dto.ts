import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { RolStaff } from '../entities/user-staff.entity';

export class CreateStaffDto {
  @IsString({ message: 'El nombre es obligatorio' })
  @Length(10, 30, { message: 'El nombre debe tener entre 10 y 30 caracteres' })
  nombre: string;

  @IsEmail(
    {},
    { message: 'El correo no tiene un formato válido (usuario@dominio.com)' },
  )
  correo: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @Length(8, 20, {
    message: 'La contraseña debe tener entre 8 y 20 caracteres',
  })
  contrasena: string;

  @IsEnum(RolStaff, {
    message: 'El rol debe ser admin, cocinero o domiciliario',
  })
  rol: RolStaff;
}
