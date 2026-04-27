import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class PushSuscripcionDto {
  @IsString()
  @IsNotEmpty()
  tokenSesion: string;

  @IsObject()
  suscripcion: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };
}
