import { IsIn, IsOptional, IsString } from 'class-validator';

export class CrearSesionDto {
  @IsString()
  @IsOptional()
  @IsIn(['web', 'android', 'ios'])
  plataforma?: string;
}
