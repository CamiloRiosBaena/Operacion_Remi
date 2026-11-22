import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { EstadoStaff, RolStaff } from '../entities/user-staff.entity';

// Mismas reglas que CreateStaffDto, pero todos los campos son opcionales.
export class UpdateStaffDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsOptional()
  @Length(10, 30, { message: 'El nombre debe tener entre 10 y 30 caracteres' })
  nombre?: string;

  @IsEnum(RolStaff, {
    message: 'El rol debe ser admin, cocinero o domiciliario',
  })
  @IsOptional()
  rol?: RolStaff;

  @IsEnum(EstadoStaff, { message: 'El estado debe ser activo o inactivo' })
  @IsOptional()
  estado?: EstadoStaff;

  @IsString({ message: 'La contraseña debe ser texto' })
  @IsOptional()
  @Length(8, 20, {
    message: 'La contraseña debe tener entre 8 y 20 caracteres',
  })
  contrasena?: string;
}
