import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthService } from './auth.service';
import { RolStaff, UserStaff } from './entities/user-staff.entity';

function contexto(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guard(
  roles: RolStaff[] | undefined,
  staff: Partial<UserStaff> | null,
) {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  const auth = {
    findStaffActivoPorUid: jest.fn().mockResolvedValue(staff),
  } as unknown as AuthService;
  return new RolesGuard(reflector, auth);
}

describe('RolesGuard', () => {
  const usuario = { supabaseUser: { id: 'uid-1' } };

  it('deja pasar si la ruta no declara roles', async () => {
    await expect(
      guard(undefined, null).canActivate(contexto({})),
    ).resolves.toBe(true);
  });

  it('responde 401 si no hay usuario autenticado', async () => {
    await expect(
      guard([RolStaff.ADMIN], null).canActivate(contexto({})),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde 403 si el usuario no es personal activo (por ejemplo, un cliente)', async () => {
    await expect(
      guard([RolStaff.ADMIN], null).canActivate(contexto({ ...usuario })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('responde 403 si el rol del staff no está permitido', async () => {
    await expect(
      guard([RolStaff.ADMIN], { rol: RolStaff.COCINERO }).canActivate(
        contexto({ ...usuario }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deja pasar al staff con un rol permitido y lo adjunta a la petición', async () => {
    const req: Record<string, unknown> = { ...usuario };
    await expect(
      guard([RolStaff.COCINERO, RolStaff.ADMIN], {
        id: 3,
        rol: RolStaff.COCINERO,
      }).canActivate(contexto(req)),
    ).resolves.toBe(true);
    expect(req.staff).toMatchObject({ id: 3 });
  });
});
