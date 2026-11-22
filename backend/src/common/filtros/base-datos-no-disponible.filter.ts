import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

/** Segundos que se le sugiere al cliente esperar antes de reintentar. */
export const REINTENTAR_EN_SEGUNDOS = 5;

/** Intervalo mínimo entre dos avisos en el log mientras la base sigue caída. */
const INTERVALO_AVISO_MS = 10_000;

/** Códigos de red y de PostgreSQL que indican que no hay conexión con la base. */
const CODIGOS_SIN_CONEXION = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
  '08000', // connection_exception
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08003', // connection_does_not_exist
  '08006', // connection_failure
]);

const MENSAJES_SIN_CONEXION =
  /Connection terminated|timeout exceeded when trying to connect|Connection is not established/i;

interface ErrorConCodigo {
  code?: unknown;
  message?: unknown;
  driverError?: unknown;
  errors?: unknown;
}

/** Indica si el error se debe a que la base de datos no está disponible. */
export function esErrorDeConexion(error: unknown, profundidad = 0): boolean {
  if (!error || typeof error !== 'object' || profundidad > 3) return false;
  const e = error as ErrorConCodigo;
  if (typeof e.code === 'string' && CODIGOS_SIN_CONEXION.has(e.code))
    return true;
  if (typeof e.message === 'string' && MENSAJES_SIN_CONEXION.test(e.message))
    return true;
  if (esErrorDeConexion(e.driverError, profundidad + 1)) return true;
  return (
    Array.isArray(e.errors) &&
    e.errors.some((x) => esErrorDeConexion(x, profundidad + 1))
  );
}

/**
 * Si la base de datos no responde, la API contesta 503 con Retry-After en lugar de un 500
 * genérico: el cliente sabe que el fallo es temporal y puede reintentar. Los demás errores
 * siguen el manejo normal de NestJS.
 */
@Catch()
export class BaseDatosNoDisponibleFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('BaseDeDatos');
  private ultimoAviso = 0;
  private omitidos = 0;

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http' || !esErrorDeConexion(exception)) {
      return super.catch(exception, host);
    }
    this.avisar(exception);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .setHeader('Retry-After', String(REINTENTAR_EN_SEGUNDOS))
      .json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message:
          'Servicio temporalmente no disponible, intenta de nuevo en unos segundos',
      });
  }

  /** Una línea de aviso cada 10 s como máximo, en lugar de la traza completa por petición. */
  private avisar(exception: unknown) {
    const ahora = Date.now();
    if (ahora - this.ultimoAviso < INTERVALO_AVISO_MS) {
      this.omitidos++;
      return;
    }
    const detalle =
      exception instanceof Error ? exception.message : String(exception);
    const extra = this.omitidos
      ? ` (${this.omitidos} avisos similares omitidos)`
      : '';
    this.logger.warn(
      `Base de datos no disponible: ${detalle || 'sin conexión'}${extra}`,
    );
    this.ultimoAviso = ahora;
    this.omitidos = 0;
  }
}
