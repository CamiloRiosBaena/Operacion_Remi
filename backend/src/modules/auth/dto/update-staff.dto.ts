import { IsEnum, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { EstadoStaff, RolStaff } from '../entities/user-staff.entity';

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  @Length(1, 100)
  nombre?: string;

  @IsEnum(RolStaff)
  @IsOptional()
  rol?: RolStaff;

  @IsEnum(EstadoStaff)
  @IsOptional()
  estado?: EstadoStaff;

  @IsString()
  @IsOptional()
  @MinLength(6)
  contrasena?: string;
}
