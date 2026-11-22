import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { NotificacionesService } from './notificaciones.service';
import { SupabaseGuard } from './supabase.guard';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { EstadoCliente } from './entities/cliente.entity';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { PushSuscripcionDto } from './dto/push-suscripcion.dto';
import type { User } from '@supabase/supabase-js';
import { SoloRoles } from './roles.guard';
import { RolStaff } from './entities/user-staff.entity';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notiService: NotificacionesService,
  ) {}

  // ─────────────────────────────────────────
  // SESIONES DE INVITADO (público)
  // ─────────────────────────────────────────

  /** POST /api/auth/sesiones — crea una sesión anónima para clientes sin cuenta */
  @Post('sesiones')
  crearSesion(@Body() dto: CrearSesionDto) {
    return this.notiService.crearSesion(dto.plataforma ?? 'web');
  }

  /** GET /api/auth/vapid-key — devuelve la clave pública VAPID para suscripción push */
  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: this.notiService.getVapidPublicKey() };
  }

  /** PATCH /api/auth/sesiones/push — registra la suscripción push de la sesión */
  @Patch('sesiones/push')
  registrarPush(@Body() dto: PushSuscripcionDto) {
    return this.notiService.registrarPushToken(
      dto.tokenSesion,
      dto.suscripcion,
    );
  }

  // ─────────────────────────────────────────
  // REGISTRO DE CLIENTES (público — sin confirmación de email)
  // ─────────────────────────────────────────

  /** POST /api/auth/registro — crea cuenta de cliente sin enviar email de confirmación */
  @Post('registro')
  registroCliente(@Body() dto: RegistroClienteDto) {
    return this.authService.registroCliente(dto);
  }

  // ─────────────────────────────────────────
  // SYNC — llamado desde el frontend tras signUp con Supabase
  // ─────────────────────────────────────────

  /** POST /api/auth/sync/cliente — crea el registro de cliente en la DB */
  @Post('sync/cliente')
  @UseGuards(SupabaseGuard)
  syncCliente(@Req() req: Request) {
    const u = req['supabaseUser'] as User;
    return this.authService.syncCliente({
      supabase_uid: u.id,
      nombre: (u.user_metadata?.nombre as string) ?? u.email ?? '',
      correo: u.email ?? '',
    });
  }

  // ─────────────────────────────────────────
  // GESTIÓN DE STAFF (solo admin)
  // ─────────────────────────────────────────

  @Get('staff')
  @SoloRoles(RolStaff.ADMIN)
  findAllStaff() {
    return this.authService.findAllStaff();
  }

  @Get('staff/:id')
  @SoloRoles(RolStaff.ADMIN)
  findOneStaff(@Param('id', ParseIdPipe) id: number) {
    return this.authService.findOneStaff(id);
  }

  @Post('staff')
  @SoloRoles(RolStaff.ADMIN)
  createStaff(@Body() dto: CreateStaffDto) {
    return this.authService.createStaff(dto);
  }

  @Patch('staff/:id')
  @SoloRoles(RolStaff.ADMIN)
  updateStaff(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.authService.updateStaff(id, dto);
  }

  @Delete('staff/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SoloRoles(RolStaff.ADMIN)
  deleteStaff(@Param('id', ParseIdPipe) id: number, @Req() req: Request) {
    const caller = (req as any)['supabaseUser'] as User;
    return this.authService.deleteStaff(id, caller.id);
  }

  // ─────────────────────────────────────────
  // GESTIÓN DE CLIENTES (solo admin)
  // ─────────────────────────────────────────

  @Get('clientes')
  @SoloRoles(RolStaff.ADMIN)
  findAllClientes() {
    return this.authService.findAllClientes();
  }

  /** PATCH /api/auth/clientes/:id/estado — activar/suspender/banear */
  @Patch('clientes/:id/estado')
  @SoloRoles(RolStaff.ADMIN)
  updateEstadoCliente(
    @Param('id', ParseIdPipe) id: number,
    @Body('estado') estado: EstadoCliente,
  ) {
    return this.authService.updateEstadoCliente(id, estado);
  }
}
