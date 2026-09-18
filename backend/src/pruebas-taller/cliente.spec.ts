/**
 * Taller de Pruebas de Software — Módulo "Registro de Cliente"
 * Fuente: Fase1.docx, sección 1 "Registro de cliente", tabla "Diseño casos de pruebas" (CP01-CP15).
 *
 * Caja negra (CP01-CP12): RegistroClienteDto + class-validator.
 * Caja blanca (CP13-CP15): AuthService.registroCliente (camino básico).
 *
 * El DTO real (registro-cliente.dto.ts) fue ajustado para cumplir el análisis de Parte A:
 * `@Length(10, 30)` para "nombre" y `@Length(8, 20)` para "contrasena".
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { RegistroClienteDto } from '../modules/auth/dto/registro-cliente.dto';
import { AuthService } from '../modules/auth/auth.service';

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

async function errores(payload: Partial<RegistroClienteDto>) {
  return validate(plainToInstance(RegistroClienteDto, payload));
}

describe('CAJA NEGRA — RegistroClienteDto', () => {
  it('CP01 - Clase válida: nombre, correo y contraseña dentro de rango', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
    });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase no válida: nombre corto, correo sin @ y contraseña corta', async () => {
    const err = await errores({ nombre: 'Camilo', correo: 'camilogmail.com', contrasena: 'Clave' });
    expect(err.some((e) => e.property === 'correo')).toBe(true);
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP03 - Clase no válida: nombre 33 caracteres, correo sin dominio, contraseña 21 caracteres', async () => {
    const err = await errores({
      nombre: 'CamiloRiosXxXxXxXxXxXxXxXxXxXxX',
      correo: 'camilo@',
      contrasena: 'Clave1234567890123456',
    });
    expect(err.some((e) => e.property === 'correo')).toBe(true);
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });

  it('CP04 - Clase no válida: nombre, correo y contraseña nulos (campos requeridos)', async () => {
    const err = await errores({ nombre: null as any, correo: null as any, contrasena: null as any });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'correo')).toBe(true);
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });

  it('CP05 - Valor límite: nombre "CamiloRio" (9), justo debajo del mínimo → Error', async () => {
    const err = await errores({ nombre: 'CamiloRio', correo: 'camilo@gmail.com', contrasena: 'Clave1234' });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP06 - Valor límite: nombre "CamiloRios" (10), mínimo exacto → Ok', async () => {
    const err = await errores({ nombre: 'CamiloRios', correo: 'camilo@gmail.com', contrasena: 'Clave1234' });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP07 - Valor límite: nombre de 30 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({
      nombre: 'CamiloRiosXxXxXxXxXxXxXxXxXxXx',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP08 - Valor límite: nombre de 31 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({
      nombre: 'CamiloRiosXxXxXxXxXxXxXxXxXxXxX',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234',
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP09 - Valor límite: contraseña "Clave12" (7), justo debajo del mínimo → Error', async () => {
    const err = await errores({ nombre: 'CamiloRiosBaena', correo: 'camilo@gmail.com', contrasena: 'Clave12' });
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });

  it('CP10 - Valor límite: contraseña "Clave123" (8), mínimo exacto → Ok', async () => {
    const err = await errores({ nombre: 'CamiloRiosBaena', correo: 'camilo@gmail.com', contrasena: 'Clave123' });
    expect(err.some((e) => e.property === 'contrasena')).toBe(false);
  });

  it('CP11 - Valor límite: contraseña de 20 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave123456789012345',
    });
    expect(err.some((e) => e.property === 'contrasena')).toBe(false);
  });

  it('CP12 - Valor límite: contraseña de 21 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({
      nombre: 'CamiloRiosBaena',
      correo: 'camilo@gmail.com',
      contrasena: 'Clave1234567890123456',
    });
    expect(err.some((e) => e.property === 'contrasena')).toBe(true);
  });
});

describe('CAJA BLANCA — AuthService.registroCliente (camino básico)', () => {
  let clienteRepo: any, service: AuthService, supabase: any;

  beforeEach(() => {
    clienteRepo = mockRepo();
    supabase = { admin: { createUser: jest.fn() } };
    service = new AuthService(mockRepo(), clienteRepo, mockRepo(), supabase);
  });

  it('CP13 - Camino 1: correo ya registrado lanza BadRequestException', async () => {
    clienteRepo.findOneBy.mockResolvedValue({ id: 1, correo: 'camilo@gmail.com' });
    await expect(
      service.registroCliente({ nombre: 'CamiloRios', correo: 'camilo@gmail.com', contrasena: 'Clave1234' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(supabase.admin.createUser).not.toHaveBeenCalled();
  });

  it('CP14 - Camino 2: Supabase devuelve error al crear el usuario → BadRequestException con su mensaje', async () => {
    clienteRepo.findOneBy.mockResolvedValue(null);
    supabase.admin.createUser.mockResolvedValue({ data: null, error: { message: 'Email rate limit exceeded' } });
    await expect(
      service.registroCliente({ nombre: 'CamiloRios', correo: 'camilo@gmail.com', contrasena: 'Clave1234' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(clienteRepo.save).not.toHaveBeenCalled();
  });

  it('CP15 - Camino 3: correo libre y Supabase exitoso → cliente creado y guardado', async () => {
    clienteRepo.findOneBy.mockResolvedValue(null);
    supabase.admin.createUser.mockResolvedValue({ data: { user: { id: 'uuid-123' } }, error: null });
    const dto = { nombre: 'CamiloRios', correo: 'camilo@gmail.com', contrasena: 'Clave1234' };
    const resultado = await service.registroCliente(dto as any);
    expect(clienteRepo.save).toHaveBeenCalled();
    expect(resultado).toEqual(
      expect.objectContaining({ supabase_uid: 'uuid-123', nombre: dto.nombre, correo: dto.correo }),
    );
  });
});
