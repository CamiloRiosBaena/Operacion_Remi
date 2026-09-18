/**
 * Taller de Pruebas de Software — Módulo "Creación de Ingrediente"
 * Fuente: Fase1.docx, sección 6 "Creación de Ingrediente", tabla "Diseño casos de pruebas" (CP01-CP17).
 *
 * Caja negra (CP01-CP16): CreateIngredienteDto + class-validator.
 * Caja blanca (CP17): MenuService.createIngrediente (camino único).
 *
 * Mapeo de nombres del Word → propiedades reales del DTO:
 *   Unidad → unidadCompra | Gramos → gramosPorUnidad | StockActual → stockUnidades |
 *   StockMinimo → stockMinimoPorciones
 *
 * El DTO real (create-ingrediente.dto.ts) fue ajustado para cumplir el análisis de Parte A:
 * `@Length(5, 50)` para "nombre" y `@IsIn(['Kg', 'Caja', 'Bulto'])` para "unidadCompra".
 * "gramosPorUnidad" se mantiene `@IsPositive()` (el Word, ya corregido, confirma que el mínimo
 * exacto válido es 1 y que 0 es el valor justo debajo del mínimo).
 *
 * "stockUnidades" y "stockMinimoPorciones" son `@IsOptional()` con valores por defecto en
 * MenuService.createIngrediente (0 y 10 respectivamente): un `null` explícito se trata como
 * "no enviado" y no genera error de validación, por eso los CP05/CP06 no verifican esos dos
 * campos cuando llegan nulos.
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateIngredienteDto } from '../modules/menu/dto/create-ingrediente.dto';
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
  const ingredienteRepo = mockRepo();
  const service = new MenuService(
    mockRepo(), // categoriaRepo
    mockRepo(), // platoRepo
    ingredienteRepo,
    mockRepo(), // piRepo
    mockRepo(), // extraRepo
    mockRepo(), // detalleRepo
    mockRepo(), // promoRepo
  );
  return { service, ingredienteRepo };
}

async function errores(payload: Partial<CreateIngredienteDto>) {
  return validate(plainToInstance(CreateIngredienteDto, payload));
}

describe('CAJA NEGRA — CreateIngredienteDto', () => {
  const base = { nombre: 'Aguacate', gramosPorUnidad: 20, stockUnidades: 2, stockMinimoPorciones: 2 };

  it('CP01 - Clase válida: unidadCompra Kg', async () => {
    const err = await errores({ ...base, unidadCompra: 'Kg' });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase válida: unidadCompra Caja', async () => {
    const err = await errores({ ...base, unidadCompra: 'Caja' });
    expect(err.length).toBe(0);
  });

  it('CP03 - Clase válida: unidadCompra Bulto', async () => {
    const err = await errores({ ...base, unidadCompra: 'Bulto' });
    expect(err.length).toBe(0);
  });

  it('CP04 - Clase no válida: nombre corto, unidad fuera de dominio, gramos/stocks negativos', async () => {
    const err = await errores({
      nombre: 'Palo',
      unidadCompra: 'Coso',
      gramosPorUnidad: -1,
      stockUnidades: -1,
      stockMinimoPorciones: -1,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'unidadCompra')).toBe(true);
    expect(err.some((e) => e.property === 'gramosPorUnidad')).toBe(true);
    expect(err.some((e) => e.property === 'stockUnidades')).toBe(true);
    expect(err.some((e) => e.property === 'stockMinimoPorciones')).toBe(true);
  });

  it('CP05 - Clase no válida: nombre >50 caracteres, unidad fuera de dominio, resto nulo', async () => {
    const err = await errores({
      nombre: 'a'.repeat(60),
      unidadCompra: 'Coso',
      gramosPorUnidad: null as any,
      stockUnidades: null as any,
      stockMinimoPorciones: null as any,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
    expect(err.some((e) => e.property === 'unidadCompra')).toBe(true);
    // gramosPorUnidad es requerido (sin @IsOptional): null sí falla.
    expect(err.some((e) => e.property === 'gramosPorUnidad')).toBe(true);
    // stockUnidades/stockMinimoPorciones son @IsOptional() con valor por defecto:
    // un null explícito se trata como "no enviado" y no genera error (comportamiento esperado).
  });

  it('CP06 - Clase no válida: nombre nulo (campo requerido)', async () => {
    const err = await errores({
      nombre: null as any,
      unidadCompra: 'Coso',
      gramosPorUnidad: null as any,
      stockUnidades: null as any,
      stockMinimoPorciones: null as any,
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP07 - Valor límite: nombre "Ingr" (4), justo debajo del mínimo → Error', async () => {
    const err = await errores({ ...base, nombre: 'Ingr', unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP08 - Valor límite: nombre "Palta" (5), mínimo exacto → Ok', async () => {
    const err = await errores({ ...base, nombre: 'Palta', unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP09 - Valor límite: nombre de 50 caracteres, máximo exacto → Ok', async () => {
    const err = await errores({
      ...base,
      nombre: 'Palta123456789012345678901234567890123456789012345',
      unidadCompra: 'Kg',
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(false);
  });

  it('CP10 - Valor límite: nombre de 51 caracteres, justo sobre el máximo → Error', async () => {
    const err = await errores({
      ...base,
      nombre: 'Palta1234567890123456789012345678901234567890123456',
      unidadCompra: 'Kg',
    });
    expect(err.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('CP11 - Valor límite: gramos 0, justo debajo del mínimo → Error', async () => {
    const err = await errores({ ...base, gramosPorUnidad: 0, unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'gramosPorUnidad')).toBe(true);
  });

  it('CP12 - Valor límite: gramos 1, mínimo exacto → Ok', async () => {
    const err = await errores({ ...base, gramosPorUnidad: 1, unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'gramosPorUnidad')).toBe(false);
  });

  it('CP13 - Valor límite: stockActual -1, justo debajo del mínimo → Error', async () => {
    const err = await errores({ ...base, stockUnidades: -1, unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'stockUnidades')).toBe(true);
  });

  it('CP14 - Valor límite: stockActual 0, mínimo exacto → Ok', async () => {
    const err = await errores({ ...base, stockUnidades: 0, unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'stockUnidades')).toBe(false);
  });

  it('CP15 - Valor límite: stockMinimo -1, justo debajo del mínimo → Error', async () => {
    const err = await errores({ ...base, stockMinimoPorciones: -1, unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'stockMinimoPorciones')).toBe(true);
  });

  it('CP16 - Valor límite: stockMinimo 0, mínimo exacto → Ok', async () => {
    const err = await errores({ ...base, stockMinimoPorciones: 0, unidadCompra: 'Kg' });
    expect(err.some((e) => e.property === 'stockMinimoPorciones')).toBe(false);
  });
});

describe('CAJA BLANCA — MenuService.createIngrediente (camino único)', () => {
  it('CP17 - Camino único: ingrediente creado y guardado exitosamente', async () => {
    const { service, ingredienteRepo } = buildService();
    const resultado = await service.createIngrediente({
      nombre: 'Papa',
      unidadCompra: 'Kg',
      gramosPorUnidad: 20,
      stockUnidades: 10,
      stockMinimoPorciones: 10,
    } as any);
    expect(ingredienteRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Papa',
        unidadCompra: 'Kg',
        gramosPorUnidad: 20,
        stockUnidades: 10,
        stockMinimoPorciones: 10,
      }),
    );
    expect(resultado).toEqual(expect.objectContaining({ nombre: 'Papa' }));
  });
});
