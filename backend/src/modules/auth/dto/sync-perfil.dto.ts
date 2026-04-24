import { IsEmail, IsString, IsUUID } from 'class-validator';

export class SyncPerfilDto {
  @IsUUID()
  supabase_uid: string;

  @IsString()
  nombre: string;

  @IsEmail()
  correo: string;
}
