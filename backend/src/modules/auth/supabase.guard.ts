import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAdminService } from './supabase-admin.service';

@Injectable()
export class SupabaseGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) throw new UnauthorizedException('Token requerido');

    const { data, error } = await this.supabase.verifyToken(token);
    if (error || !data.user) throw new UnauthorizedException('Token inválido o expirado');

    req['supabaseUser'] = data.user;
    return true;
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
