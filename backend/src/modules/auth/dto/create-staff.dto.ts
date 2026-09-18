import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { RolStaff } from '../entities/user-staff.entity';

export class CreateStaffDto {
  @IsString()
  @Length(10, 30)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @Length(8, 20)
  contrasena: string;

  @IsEnum(RolStaff)
  rol: RolStaff;
}
