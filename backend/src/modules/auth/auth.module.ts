import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NotificacionesService } from './notificaciones.service';
import { SupabaseAdminService } from './supabase-admin.service';
import { SupabaseGuard } from './supabase.guard';
import { UserStaff } from './entities/user-staff.entity';
import { Cliente } from './entities/cliente.entity';
import { SesionCliente } from './entities/sesion-cliente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserStaff, Cliente, SesionCliente]),
  ],
  controllers: [AuthController],
  providers: [AuthService, NotificacionesService, SupabaseAdminService, SupabaseGuard],
  exports: [AuthService, NotificacionesService, SupabaseAdminService, SupabaseGuard],
})
export class AuthModule {}
