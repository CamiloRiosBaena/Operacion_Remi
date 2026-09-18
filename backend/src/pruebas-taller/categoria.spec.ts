/**
 * Taller de Pruebas de Software — Módulo "Creación de Categoría de Menú"
 * Fuente: Fase1.docx, sección 4 "Creación de Categoría de Menú", tabla "Diseño casos de pruebas" (CP01-CP10).
 *
 * Caja negra (CP01-CP08): CreateCategoriaDto + class-validator.
 * Caja blanca (CP09-CP10): MenuService.createCategoria (camino básico).
 *
 * El DTO real (create-categoria.dto.ts) fue ajustado para cumplir el análisis de Parte A:
 * `@Length(5, 50)` para "nombre".
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { CreateCategoriaDto } from '../modules/menu/dto/create-categoria.dto';
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
  const service = new MenuService(
    categoriaRepo,
    mockRepo(), // platoRepo
    mockRepo(), // ingredienteRepo
    mockRepo(), // piRepo
    mockRepo(), // extraRepo
    mockRepo(), // detalleRepo
    mockRepo(), // promoRepo
  );
  return { service, categoriaRepo };
}

async function errores(payload: Partial<CreateCategoriaDto>) {
  return validate(plainToInstance(CreateCategoriaDto, payload));
}

describe('CAJA NEGRA — CreateCategoriaDto', () => {
  it('CP01 - Clase válida: nombre "Postre"', async () => {
    const err = await errores({ nombre: 'Postre' });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase no válida: nombre "Algo" (4), muy corto', async () => {
    const err = await errores({ nombre: 'Algo' });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP03 - Clase no válida: nombre de 53 caracteres, muy largo', async () => {
    const err = await errores({ nombre: 'a'.repeat(53) });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP04 - Clase no válida: nombre nulo (campo requerido)', async () => {
    const err = await errores({ nombre: null as any });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP05 - Valor límite: nombre "algo" (4), justo debajo del mínimo → Error', async () => {
    const err = await errores({ nombre: 'algo' });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP06 - Valor límite: nombre "algas" (5), mínimo exacto → Ok', async () => {
    const err = await errores({ nombre: 'algas' });
    expect(err.length).toBe(0);
  });

  it('CP07 - Valor límite: nombre de 50 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({ nombre: 'a'.repeat(50) });
    expect(err.length).toBe(0);
  });

  it('CP08 - Valor límite: nombre de 51 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({ nombre: 'a'.repeat(51) });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });
});

describe('CAJA BLANCA — MenuService.createCategoria (camino básico)', () => {
  it('CP09 - Camino 1: nombre "Algo" ya existe lanza BadRequestException', async () => {
    const { service, categoriaRepo } = buildService();
    categoriaRepo.findOneBy.mockResolvedValue({ id: 1, nombre: 'Algo' });
    await expect(service.createCategoria({ nombre: 'Algo' })).rejects.toBeInstanceOf(BadRequestException);
    expect(categoriaRepo.save).not.toHaveBeenCalled();
  });

  it('CP10 - Camino 2: nombre "Algas" nuevo crea y guarda la categoría', async () => {
    const { service, categoriaRepo } = buildService();
    categoriaRepo.findOneBy.mockResolvedValue(null);
    const resultado = await service.createCategoria({ nombre: 'Algas' });
    expect(categoriaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Algas' }));
    expect(resultado).toEqual(expect.objectContaining({ nombre: 'Algas' }));
  });
});
