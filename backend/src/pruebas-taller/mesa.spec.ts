/**
 * Taller de Pruebas de Software — Módulo "Creación de Mesa"
 * Fuente: Fase1.docx, sección 3 "Creación de Mesa", tabla "Diseño casos de pruebas" (CP01-CP08).
 *
 * Caja negra (CP01-CP06): CreateMesaDto + class-validator.
 * Caja blanca (CP07-CP08): PedidosService.createMesa (camino básico).
 *
 * Este módulo es el único sin discrepancias entre el análisis de Parte A y el código real:
 * CreateMesaDto exige exactamente `@IsInt() @IsPositive()`, igual que "Numero > 0" del Word,
 * y PedidosService.createMesa lanza BadRequestException ante un número duplicado tal como
 * describe la tabla de camino básico.
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { CreateMesaDto } from '../modules/pedidos/dto/create-mesa.dto';
import { PedidosService } from '../modules/pedidos/pedidos.service';

function mockRepo() {
  return {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn().mockResolvedValue([]),
    find: jest.fn(),
    create: jest.fn((x: any) => x),
    save: jest.fn((x: any) => Promise.resolve({ id: 1, ...x })),
    remove: jest.fn(),
  } as any;
}

function buildService() {
  const mesaRepo = mockRepo();
  const service = new PedidosService(
    mockRepo(), // pedidoRepo
    mockRepo(), // detalleRepo
    mockRepo(), // historialRepo
    mockRepo(), // tokenQrRepo
    mockRepo(), // platoRepo
    mockRepo(), // promoRepo
    mesaRepo, // mesaRepo
    mockRepo(), // clienteRepo
    mockRepo(), // staffRepo
    { enviarPush: jest.fn() } as any, // notiService
  );
  return { service, mesaRepo };
}

async function errores(payload: Partial<CreateMesaDto>) {
  return validate(plainToInstance(CreateMesaDto, payload));
}

describe('CAJA NEGRA — CreateMesaDto', () => {
  it('CP01 - Clase válida: número 1', async () => {
    const err = await errores({ numero: 1 });
    expect(err.length).toBe(0);
  });

  it('CP02 - Clase no válida: número 0', async () => {
    const err = await errores({ numero: 0 });
    expect(err.some((e) => e.property === 'numero')).toBe(true);
  });

  it('CP03 - Clase no válida: número no es un número ("A")', async () => {
    const err = await errores({ numero: 'A' as any });
    expect(err.some((e) => e.property === 'numero')).toBe(true);
  });

  it('CP04 - Clase no válida: número nulo (campo requerido)', async () => {
    const err = await errores({ numero: null as any });
    expect(err.some((e) => e.property === 'numero')).toBe(true);
  });

  it('CP05 - Valor límite: número 0, justo debajo del mínimo → Error', async () => {
    const err = await errores({ numero: 0 });
    expect(err.some((e) => e.property === 'numero')).toBe(true);
  });

  it('CP06 - Valor límite: número 1, mínimo exacto → Ok', async () => {
    const err = await errores({ numero: 1 });
    expect(err.length).toBe(0);
  });
});

describe('CAJA BLANCA — PedidosService.createMesa (camino básico)', () => {
  it('CP07 - Camino 1: número de mesa ya existente lanza BadRequestException', async () => {
    const { service, mesaRepo } = buildService();
    mesaRepo.findOneBy.mockResolvedValue({ id: 1, numero: 1 });
    await expect(service.createMesa(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(mesaRepo.save).not.toHaveBeenCalled();
  });

  it('CP08 - Camino 2: número de mesa nuevo crea y guarda el registro', async () => {
    const { service, mesaRepo } = buildService();
    mesaRepo.findOneBy.mockResolvedValue(null);
    const resultado = await service.createMesa(2);
    expect(mesaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ numero: 2 }));
    expect(resultado).toEqual(expect.objectContaining({ numero: 2 }));
  });
});
