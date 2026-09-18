/**
 * Taller de Pruebas de Software — Módulo "Creación de Usuario Staff"
 * Fuente: Fase1.docx, sección 2 "Creación de Usuario Staff", tabla "Diseño casos de pruebas" (CP01-CP17).
 *
 * Caja negra (CP01-CP14): CreateStaffDto + class-validator.
 * Caja blanca (CP15-CP17): AuthService.createStaff (camino básico).
 *
 * NOTA: la tabla usa las etiquetas legibles "Administrador/Cocinero/Domiciliario"; el valor real
 * del enum es RolStaff.ADMIN = 'admin', RolStaff.COCINERO = 'cocinero', RolStaff.DOMICILIARIO =
 * 'domiciliario'. Se usan los valores reales del enum (no invención de literales).
 *
 * El DTO real (create-staff.dto.ts) fue ajustado para cumplir el análisis de Parte A:
 * `@Length(10, 30)` para "nombre" y `@Length(8, 20)` para "contrasena".
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { CreateStaffDto } from '../modules/auth/dto/create-staff.dto';
import { AuthService } from '../modules/auth/auth.service';
import { RolStaff } from '../modules/auth/entities/user-staff.entity';

function mockRepo() {
  return {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((x: any) => x),
    save: jest.fn((x: any) => Promise.resolve({ id: 1, ...x })),
    remove: jest.fn(),
  } as any;
}

async function errores(payload: Partial<CreateStaffDto>) {
  return validate(plainToInstance(CreateStaffDto, payload));
}

describe('CAJA NEGRA — CreateStaffDto', () => {
  it('CP01 - Clase válida: rol Administrador', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.ADMIN,
    });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase válida: rol Cocinero', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.COCINERO,
    });
    expect(err.length).toBe(0);
  });

  it('CP03 - Clase válida: rol Domiciliario', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.DOMICILIARIO,
    });
    expect(err.length).toBe(0);
  });

  it('CP04 - Clase no válida: nombre corto, correo sin @, contraseña corta, rol inválido', async () => {
    const err = await errores({
      nombre: 'Camilo',
      correo: 'camilogmail.com',
      contrasena: 'Clave',
      rol: 'Cliente' as any,
    });
    expect(err.some((e) => e.property === 'correo')).toBe(true);
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
    expect(err.some((e) => e.property === 'rol')).toBe(true);
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP05 - Clase no válida: todos los campos fuera de rango', async () => {
    const err = await errores({
      nombre: 'A'.repeat(32),
      correo: 'camilo@',
      contrasena: 'Clave1234567890123456', // 21 caracteres
      rol: 'Cliente' as any,
    });
    expect(err.some((e) => e.property === 'correo')).toBe(true);
    expect(err.some((e) => e.property === 'rol')).toBe(true);
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });

  it('CP06 - Clase no válida: campos nulos y rol inválido (campos requeridos)', async () => {
    const err = await errores({
      nombre: null as any,
      correo: null as any,
      contrasena: null as any,
      rol: 'Cliente' as any,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'correo')).toBe(true);
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
    expect(err.some((e) => e.property === 'rol')).toBe(true);
  });

  it('CP07 - Valor límite: nombre "CamiloRio" (9), justo debajo del mínimo → Error', async () => {
    const err = await errores({
      nombre: 'CamiloRio',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP08 - Valor límite: nombre "CamiloRios" (10), mínimo exacto → Ok', async () => {
    const err = await errores({
      nombre: 'CamiloRios',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP09 - Valor límite: nombre de 30 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({
      nombre: 'CamiloRiosXxXxXxXxXxXxXxXxXxXx',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP10 - Valor límite: nombre de 31 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({
      nombre: 'CamiloRiosXxXxXxXxXxXxXxXxXxXxX',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP11 - Valor límite: contraseña "Clave12" (7), justo debajo del mínimo → Error', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave12',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });

  it('CP12 - Valor límite: contraseña "Clave123" (8), mínimo exacto → Ok', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave123',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'contrasena')).toBe(false);
  });

  it('CP13 - Valor límite: contraseña de 20 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave123456789012345',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'contrasena')).toBe(false);
  });

  it('CP14 - Valor límite: contraseña de 21 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234567890123456',
      rol: RolStaff.ADMIN,
    });
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });
});

describe('CAJA BLANCA — AuthService.createStaff (camino básico)', () => {
  let staffRepo: any, service: AuthService, supabase: any;

  beforeEach(() => {
    staffRepo = mockRepo();
    supabase = { admin: { createUser: jest.fn() } };
    service = new AuthService(staffRepo, mockRepo(), mockRepo(), supabase);
  });

  it('CP15 - Camino 1: correo ya registrado en staff lanza BadRequestException', async () => {
    staffRepo.findOneBy.mockResolvedValue({ id: 1, correo: 'camilo@gmail.com' });
    await expect(
      service.createStaff({
        nombre: 'CamiloRios',
        correo: 'camilo@gmail.com',
        contrasena: 'Clave1234',
        rol: RolStaff.COCINERO,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(supabase.admin.createUser).not.toHaveBeenCalled();
  });

  it('CP16 - Camino 2: Supabase devuelve error al crear el usuario → BadRequestException con su mensaje', async () => {
    staffRepo.findOneBy.mockResolvedValue(null);
    supabase.admin.createUser.mockResolvedValue({ data: null, error: { message: 'duplicate' } });
    await expect(
      service.createStaff({
        nombre: 'CamiloRios',
        correo: 'camilo@correo.com',
        contrasena: 'Clave1234',
        rol: RolStaff.COCINERO,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(staffRepo.save).not.toHaveBeenCalled();
  });

  it('CP17 - Camino 3: correo libre y Supabase exitoso → staff creado y guardado', async () => {
    staffRepo.findOneBy.mockResolvedValue(null);
    supabase.admin.createUser.mockResolvedValue({ data: { user: { id: 'uuid-staff-1' } }, error: null });
    const dto = {
      nombre: 'CamiloRios',
      correo: 'camilo@correo.com',
      contrasena: 'Clave1234',
      rol: RolStaff.COCINERO,
    };
    const resultado = await service.createStaff(dto as any);
    expect(staffRepo.save).toHaveBeenCalled();
    expect(resultado).toEqual(
      expect.objectContaining({ supabase_uid: 'uuid-staff-1', correo: dto.correo, rol: dto.rol }),
    );
  });
});
