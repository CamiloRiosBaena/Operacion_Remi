import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as webpush from 'web-push';
import { SesionCliente } from './entities/sesion-cliente.entity';

export interface PushSuscripcion {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private readonly vapidReady: boolean;

  constructor(
    @InjectRepository(SesionCliente)
    private readonly sesionRepo: Repository<SesionCliente>,
    private readonly config: ConfigService,
  ) {
    const publicKey  = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    const email      = config.get<string>('VAPID_EMAIL', 'mailto:admin@operacionremi.com');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(email, publicKey, privateKey);
      this.vapidReady = true;
    } else {
      this.logger.warn('VAPID keys no configuradas — push notifications deshabilitadas');
      this.vapidReady = false;
    }
  }

  // ─────────────────────────────────────────
  // SESIONES
  // ─────────────────────────────────────────

  async crearSesion(plataforma: string = 'web'): Promise<SesionCliente> {
    const token = randomUUID();
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + 30); // 30 días

    const sesion = this.sesionRepo.create({
      tokenSesion: token,
      fechaExpiracion: expiracion,
      plataforma,
      pushToken: null,
      cliente: null,
    });

    return this.sesionRepo.save(sesion);
  }

  async registrarPushToken(
    tokenSesion: string,
    suscripcion: PushSuscripcion,
  ): Promise<void> {
    const sesion = await this.sesionRepo.findOneBy({ tokenSesion });
    if (!sesion) throw new NotFoundException('Sesión no encontrada');

    sesion.pushToken = JSON.stringify(suscripcion);
    await this.sesionRepo.save(sesion);
  }

  async getSesionPorToken(tokenSesion: string): Promise<SesionCliente | null> {
    return this.sesionRepo.findOneBy({ tokenSesion });
  }

  // ─────────────────────────────────────────
  // ENVIAR PUSH
  // ─────────────────────────────────────────

  async enviarPush(
    tokenSesion: string,
    titulo: string,
    cuerpo: string,
    url?: string,
  ): Promise<void> {
    if (!this.vapidReady) return;

    const sesion = await this.sesionRepo.findOneBy({ tokenSesion });
    if (!sesion?.pushToken) return;

    let suscripcion: PushSuscripcion;
    try {
      suscripcion = JSON.parse(sesion.pushToken);
    } catch {
      this.logger.warn(`pushToken inválido para sesión ${tokenSesion}`);
      return;
    }

    const payload = JSON.stringify({
      title: titulo,
      body: cuerpo,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url ?? '/menu' },
    });

    try {
      await webpush.sendNotification(suscripcion as any, payload);
    } catch (err: any) {
      if (err.statusCode === 410) {
        // Suscripción expirada — limpiar
        sesion.pushToken = null;
        await this.sesionRepo.save(sesion);
      } else {
        this.logger.error('Error enviando push:', err.message);
      }
    }
  }

  /** Devuelve la clave pública VAPID para que el frontend pueda suscribirse. */
  getVapidPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '');
  }
}
