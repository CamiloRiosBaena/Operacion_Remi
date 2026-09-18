/**
 * Taller de Pruebas de Software — Módulo "Creación de Extra"
 * Fuente: Fase1.docx, sección 7 "Creación de Extra", tabla "Diseño casos de pruebas" (CP01-CP12).
 *
 * Caja negra (CP01-CP10): CreateExtraDto + class-validator.
 * Caja blanca (CP11-CP12): MenuService.createExtra (camino básico).
 *
 * El DTO real (create-extra.dto.ts) fue ajustado para cumplir el análisis de Parte A:
 * `@Length(5, 30)` para "nombre". El DTO real también exige "platoId" (entero positivo), no
 * mencionado en el análisis de Parte A: se incluye un platoId válido en los CP de caja negra
 * para aislar los campos bajo prueba (nombre/precio), y se usa explícitamente en los caminos
 * básicos. MenuService.createExtra fue ajustado para lanzar BadRequestException (no
 * NotFoundException) cuando el plato no existe, tal como describe el Camino 1 del Word.
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { CreateExtraDto } from '../modules/menu/dto/create-extra.dto';
import { MenuService } from '../modules/menu/menu.service';

function mockRepo() {
  return {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findOneByOrFail: jest.fn(),
    find: jest.fn(),
    create: jest.fn((x: any) => x),
    save: jest.fn((x: any) => Promise.resolve({ id: 1, ...x })),
    remove: jest.fn(),
  } as any;
}

function buildService() {
  const platoRepo = mockRepo();
  const extraRepo = mockRepo();
  const service = new MenuService(
    mockRepo(), // categoriaRepo
    platoRepo,
    mockRepo(), // ingredienteRepo
    mockRepo(), // piRepo
    extraRepo,
    mockRepo(), // detalleRepo
    mockRepo(), // promoRepo
  );
  return { service, platoRepo, extraRepo };
}

async function errores(payload: Partial<CreateExtraDto>) {
  return validate(plainToInstance(CreateExtraDto, payload));
}

describe('CAJA NEGRA — CreateExtraDto', () => {
  it('CP01 - Clase válida: nombre "Palta", precio 500', async () => {
    const err = await errores({ nombre: 'Palta', precio: 500, platoId: 1 });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase no válida: nombre "Pala" (4), precio 0', async () => {
    const err = await errores({ nombre: 'Pala', precio: 0, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'precio')).toBe(true);
  });

  it('CP03 - Clase no válida: nombre >30 caracteres, precio no numérico', async () => {
    const err = await errores({ nombre: 'a'.repeat(35), precio: 'A' as any, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'precio')).toBe(true);
  });

  it('CP04 - Clase no válida: nombre y precio nulos (campos requeridos)', async () => {
    const err = await errores({ nombre: null as any, precio: null as any, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'precio')).toBe(true);
  });

  it('CP05 - Valor límite: nombre "Pala" (4), justo debajo del mínimo → Error', async () => {
    const err = await errores({ nombre: 'Pala', precio: 500, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP06 - Valor límite: nombre "Palta" (5), mínimo exacto → Ok', async () => {
    const err = await errores({ nombre: 'Palta', precio: 500, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP07 - Valor límite: nombre de 30 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({ nombre: 'Palta1234567890123456789012345', precio: 500, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP08 - Valor límite: nombre de 31 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({ nombre: 'Palta12345678901234567890123456', precio: 500, platoId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP09 - Valor límite: precio 0, justo debajo del mínimo → Error', async () => {
    const err = await errores({ nombre: 'Palta', precio: 0, platoId: 1 });
    expect(err.some((e) => e.property === 'precio')).toBe(true);
  });

  it('CP10 - Valor límite: precio 1, mínimo exacto → Ok', async () => {
    const err = await errores({ nombre: 'Palta', precio: 1, platoId: 1 });
    expect(err.some((e) => e.property === 'precio')).toBe(false);
  });
});

describe('CAJA BLANCA — MenuService.createExtra (camino básico)', () => {
  it('CP11 - Camino 1: platoId 5 no existe lanza BadRequestException', async () => {
    const { service, platoRepo } = buildService();
    platoRepo.findOneBy.mockResolvedValue(null);
    await expect(service.createExtra({ nombre: 'Queso', precio: 5000, platoId: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('CP12 - Camino 2: plato existente crea y guarda el extra exitosamente', async () => {
    const { service, platoRepo, extraRepo } = buildService();
    platoRepo.findOneBy.mockResolvedValue({ id: 5, nombre: 'Ajiaco' });
    const resultado = await service.createExtra({ nombre: 'Queso', precio: 5000, platoId: 5 });
    expect(extraRepo.save).toHaveBeenCalled();
    expect(resultado).toEqual(expect.objectContaining({ nombre: 'Queso', precio: 5000 }));
  });
});
