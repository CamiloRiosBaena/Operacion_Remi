/**
 * Taller de Pruebas de Software — Módulo "Creación de Plato"
 * Fuente: Fase1.docx, sección 5 "Creación de Plato", tabla "Diseño casos de pruebas" (CP01-CP18).
 *
 * Caja negra (CP01-CP16): CreatePlatoDto + class-validator.
 * Caja blanca (CP17-CP18): MenuService.createPlato (camino básico).
 *
 * El DTO real (create-plato.dto.ts) fue ajustado para cumplir el análisis de Parte A:
 * `@Length(10, 50)` para "nombre" y `@Length(0, 200)` para "descripcion". La categoría se
 * referencia en Parte A por nombre (Bebidas/Entradas/Plato Fuertes/Postres); el DTO real usa
 * "categoriaId" (entero positivo), así que se usa un id numérico válido para representar cada
 * categoría mencionada en la tabla. MenuService.createPlato fue ajustado para lanzar
 * BadRequestException (no NotFoundException) cuando la categoría no existe, tal como describe
 * el Camino 1 del Word.
 *
 * CP14 (Valor límite de "Descripción"): la fila correspondiente en el Word está marcada "¿?"
 * (sin dato de entrada ni resultado). Por indicación del usuario se usa descripción vacía ""
 * como mínimo exacto (0 caracteres, campo opcional) → Ok.
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { CreatePlatoDto } from '../modules/menu/dto/create-plato.dto';
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
  const categoriaRepo = mockRepo();
  const platoRepo = mockRepo();
  const service = new MenuService(
    categoriaRepo,
    platoRepo,
    mockRepo(), // ingredienteRepo
    mockRepo(), // piRepo
    mockRepo(), // extraRepo
    mockRepo(), // detalleRepo
    mockRepo(), // promoRepo
  );
  return { service, categoriaRepo, platoRepo };
}

async function errores(payload: Partial<CreatePlatoDto>) {
  return validate(plainToInstance(CreatePlatoDto, payload));
}

describe('CAJA NEGRA — CreatePlatoDto', () => {
  const base = { nombre: 'Bandeja Paisa', precio: 15000, descripcion: 'Es muy buena' };

  it('CP01 - Clase válida: Disponible, IVA 0%, categoría Plato Fuertes', async () => {
    const err = await errores({ ...base, disponible: true, tasaIva: 0, categoriaId: 1 });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase válida: No disponible, IVA 5%, categoría Entradas', async () => {
    const err = await errores({ ...base, disponible: false, tasaIva: 0.05, categoriaId: 2 });
    expect(err.length).toBe(0);
  });

  it('CP03 - Clase válida: No disponible, IVA 19%, categoría Bebidas', async () => {
    const err = await errores({ ...base, disponible: false, tasaIva: 0.19, categoriaId: 3 });
    expect(err.length).toBe(0);
  });

  it('CP04 - Clase válida: No disponible, IVA 5%, categoría Postres', async () => {
    const err = await errores({ ...base, disponible: false, tasaIva: 0.05, categoriaId: 4 });
    expect(err.length).toBe(0);
  });

  it('CP05 - Clase no válida: múltiples campos inválidos', async () => {
    const err = await errores({
      nombre: 'Coso',
      precio: 0,
      descripcion: 'a'.repeat(210),
      disponible: 'Atún' as any,
      tasaIva: -0.03,
      categoriaId: 'Loco' as any,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'precio')).toBe(true);
    expect(err.some((e) => e.property === 'descripcion')).toBe(true);
    expect(err.some((e) => e.property === 'disponible')).toBe(true);
    expect(err.some((e) => e.property === 'tasaIva')).toBe(true);
    expect(err.some((e) => e.property === 'categoriaId')).toBe(true);
  });

  it('CP06 - Clase no válida: nombre >50 caracteres, precio no numérico, resto igual a CP05', async () => {
    const err = await errores({
      nombre: 'a'.repeat(60),
      precio: 'A' as any,
      descripcion: 'a'.repeat(210),
      disponible: 'Atún' as any,
      tasaIva: -0.03,
      categoriaId: 'Loco' as any,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'precio')).toBe(true);
    expect(err.some((e) => e.property === 'descripcion')).toBe(true);
    expect(err.some((e) => e.property === 'disponible')).toBe(true);
    expect(err.some((e) => e.property === 'tasaIva')).toBe(true);
    expect(err.some((e) => e.property === 'categoriaId')).toBe(true);
  });

  it('CP07 - Clase no válida: nombre y precio nulos (campos requeridos)', async () => {
    const err = await errores({
      nombre: null as any,
      precio: null as any,
      descripcion: 'a'.repeat(210),
      disponible: 'Atún' as any,
      tasaIva: -0.03,
      categoriaId: 'Loco' as any,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'precio')).toBe(true);
  });

  it('CP08 - Valor límite: nombre "Plato1234" (9), justo debajo del mínimo → Error', async () => {
    const err = await errores({ ...base, nombre: 'Plato1234', categoriaId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP09 - Valor límite: nombre "PlatoExact" (10), mínimo exacto → Ok', async () => {
    const err = await errores({ ...base, nombre: 'PlatoExact', categoriaId: 1 });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP10 - Valor límite: nombre de 50 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({
      ...base,
      nombre: 'Plato123456789012345678901234567890123456789012345',
      categoriaId: 1,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP11 - Valor límite: nombre de 51 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({
      ...base,
      nombre: 'Plato1234567890123456789012345678901234567890123456',
      categoriaId: 1,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP12 - Valor límite: precio 0, justo debajo del mínimo → Error', async () => {
    const err = await errores({ ...base, precio: 0, categoriaId: 1 });
    expect(err.some((e) => e.property === 'precio')).toBe(true);
  });

  it('CP13 - Valor límite: precio 1, mínimo exacto → Ok', async () => {
    const err = await errores({ ...base, precio: 1, categoriaId: 1 });
    expect(err.some((e) => e.property === 'precio')).toBe(false);
  });

  it('CP14 - Valor límite: descripción vacía "" (0), mínimo exacto → Ok', async () => {
    const err = await errores({ nombre: base.nombre, precio: base.precio, descripcion: '', categoriaId: 1 });
    expect(err.some((e) => e.property === 'descripcion')).toBe(false);
  });

  it('CP15 - Valor límite: descripción de 200 caracteres exactos, máximo exacto → Ok', async () => {
    const err = await errores({ ...base, descripcion: 'a'.repeat(200), categoriaId: 1 });
    expect(err.some((e) => e.property === 'descripcion')).toBe(false);
  });

  it('CP16 - Valor límite: descripción de 201 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({ ...base, descripcion: 'a'.repeat(201), categoriaId: 1 });
    expect(err.some((e) => e.property === 'descripcion')).toBe(true);
  });
});

describe('CAJA BLANCA — MenuService.createPlato (camino básico)', () => {
  it('CP17 - Camino 1: categoría no existe lanza BadRequestException', async () => {
    const { service, categoriaRepo } = buildService();
    categoriaRepo.findOneBy.mockResolvedValue(null);
    await expect(
      service.createPlato({ nombre: 'Ajiaco Colombiano', precio: 15000, categoriaId: 99 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CP18 - Camino 2: categoría existente crea y guarda el plato exitosamente', async () => {
    const { service, categoriaRepo, platoRepo } = buildService();
    categoriaRepo.findOneBy.mockResolvedValue({ id: 1, nombre: 'Plato Fuertes' });
    platoRepo.findOne.mockResolvedValue({ id: 1, nombre: 'Ajiaco Colombiano' });
    const resultado = await service.createPlato({
      nombre: 'Ajiaco Colombiano',
      precio: 15000,
      descripcion: '',
      disponible: true,
      tasaIva: 0.03,
      categoriaId: 1,
    } as any);
    expect(platoRepo.save).toHaveBeenCalled();
    expect(resultado).toEqual(expect.objectContaining({ nombre: 'Ajiaco Colombiano' }));
  });
});
