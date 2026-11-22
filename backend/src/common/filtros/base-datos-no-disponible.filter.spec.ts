import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  BaseDatosNoDisponibleFilter,
  REINTENTAR_EN_SEGUNDOS,
  esErrorDeConexion,
} from './base-datos-no-disponible.filter';

function respuestaFalsa() {
  const res = {
    status: jest.fn(),
    setHeader: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.setHeader.mockReturnValue(res);
  return res;
}

function hostHttp(res: ReturnType<typeof respuestaFalsa>): ArgumentsHost {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
}

describe('esErrorDeConexion', () => {
  it.each([
    [
      'conexión rechazada',
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:55432'), {
        code: 'ECONNREFUSED',
      }),
    ],
    [
      'AggregateError de IPv4 e IPv6',
      Object.assign(new AggregateError([{ code: 'ECONNREFUSED' }], ''), {}),
    ],
    [
      'conexión cerrada por el servidor',
      new Error('Connection terminated unexpectedly'),
    ],
    [
      'QueryFailedError con código de PostgreSQL',
      { message: 'terminating connection', driverError: { code: '57P01' } },
    ],
  ])('reconoce %s', (_nombre, error) => {
    expect(esErrorDeConexion(error)).toBe(true);
  });

  it.each([
    ['un error de validación', new BadRequestException('dato inválido')],
    [
      'un ID fuera de rango',
      {
        message: 'value is out of range for type integer',
        driverError: { code: '22003' },
      },
    ],
    ['un valor que no es error', 'texto'],
    ['undefined', undefined],
  ])('no confunde %s con una caída de la base', (_nombre, error) => {
    expect(esErrorDeConexion(error)).toBe(false);
  });
});

describe('BaseDatosNoDisponibleFilter', () => {
  const filtro = new BaseDatosNoDisponibleFilter();

  it('responde 503 con Retry-After cuando la base no está disponible', () => {
    const res = respuestaFalsa();
    filtro.catch(
      new Error('Connection terminated unexpectedly'),
      hostHttp(res),
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      String(REINTENTAR_EN_SEGUNDOS),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        error: 'Service Unavailable',
      }),
    );
  });

  it('deja los demás errores al manejo normal de NestJS', () => {
    const base = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
    const res = respuestaFalsa();
    const error = new BadRequestException('dato inválido');
    filtro.catch(error, hostHttp(res));
    expect(base).toHaveBeenCalledWith(error, expect.anything());
    expect(res.status).not.toHaveBeenCalled();
    base.mockRestore();
  });
});
