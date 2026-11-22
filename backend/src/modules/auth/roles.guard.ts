import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { RolStaff } from './entities/user-staff.entity';
import { SupabaseGuard } from './supabase.guard';

export const ROLES_KEY = 'roles';

/**
 * Autoriza solo al personal activo con alguno de los roles indicados.
 * El rol se lee de la tabla user_staff y no de los metadatos de Supabase,
 * porque el propio usuario puede modificar su user_metadata.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<RolStaff[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!roles?.length) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req['supabaseUser'] as User | undefined;
    if (!user) throw new UnauthorizedException('Token requerido');

    const staff = await this.authService.findStaffActivoPorUid(user.id);
    if (!staff || !roles.includes(staff.rol))
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );

    req['staff'] = staff;
    return true;
  }
}

/** Exige token válido y que el usuario sea personal activo con uno de estos roles. */
export function SoloRoles(...roles: RolStaff[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(SupabaseGuard, RolesGuard),
  );
}
