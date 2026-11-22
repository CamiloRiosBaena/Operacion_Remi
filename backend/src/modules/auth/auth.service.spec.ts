import { Test, TestingModule } from '@nestjs/testing';
import { ObjectLiteral, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { SupabaseAdminService } from './supabase-admin.service';
import { RolStaff, UserStaff } from './entities/user-staff.entity';
import { Cliente } from './entities/cliente.entity';
import { SesionCliente } from './entities/sesion-cliente.entity';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    })
      // Las dependencias (repositorios, Supabase, otros servicios) se simulan: aquí solo
      // se verifica que la clase se construye; la lógica se prueba en src/pruebas-taller.
      .useMocker(() => ({}))
      .compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('AuthService — compensación en Supabase Auth', () => {
  function build() {
    const repo = <T extends ObjectLiteral>() =>
      ({
        findOneBy: jest.fn().mockResolvedValue(null),
        create: jest.fn((x: object) => x),
        save: jest.fn().mockRejectedValue(new Error('fallo de base de datos')),
      }) as unknown as Repository<T>;
    const deleteUser = jest.fn().mockResolvedValue({ error: null });
    const supabase = {
      admin: {
        createUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null }),
        deleteUser,
      },
    } as unknown as SupabaseAdminService;
    const service = new AuthService(
      repo<UserStaff>(),
      repo<Cliente>(),
      repo<SesionCliente>(),
      supabase,
    );
    return { service, deleteUser };
  }

  it('borra el usuario de Supabase si falla el guardado del cliente', async () => {
    const { service, deleteUser } = build();
    await expect(
      service.registroCliente({
        nombre: 'CamiloRiosBaena',
        correo: 'c@gmail.com',
        contrasena: 'Clave1234',
      }),
    ).rejects.toThrow('fallo de base de datos');
    expect(deleteUser).toHaveBeenCalledWith('uid-1');
  });

  it('borra el usuario de Supabase si falla el guardado del staff', async () => {
    const { service, deleteUser } = build();
    await expect(
      service.createStaff({
        nombre: 'CamiloRiosBaena',
        correo: 's@gmail.com',
        contrasena: 'Clave1234',
        rol: RolStaff.COCINERO,
      }),
    ).rejects.toThrow('fallo de base de datos');
    expect(deleteUser).toHaveBeenCalledWith('uid-1');
  });
});
