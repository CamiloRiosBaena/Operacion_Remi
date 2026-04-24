import { IsEmail, IsEnum, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { RolStaff } from '../entities/user-staff.entity';

export class CreateStaffDto {
  @IsString()
  @Length(1, 100)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  contrasena: string;

  @IsEnum(RolStaff)
  rol: RolStaff;
}
