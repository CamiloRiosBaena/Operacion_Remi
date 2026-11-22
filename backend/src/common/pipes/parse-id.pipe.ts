import {
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  PipeTransform,
} from '@nestjs/common';

/** Valor máximo de una columna `integer` de PostgreSQL. */
export const ID_MAXIMO = 2_147_483_647;

/**
 * Convierte un parámetro de ruta en un ID válido para PostgreSQL.
 * A diferencia de ParseIntPipe, rechaza con 400 los valores fuera del rango
 * de la columna, que antes llegaban a la consulta y producían un 500.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(valor: string): number {
    if (!/^\d+$/.test(valor)) {
      throw new BadRequestException('El ID debe ser un número entero positivo');
    }
    const id = Number(valor);
    if (id < 1 || id > ID_MAXIMO) {
      throw new BadRequestException(`El ID debe estar entre 1 y ${ID_MAXIMO}`);
    }
    return id;
  }
}

/** Valida que el token QR sea un UUID v4, como los que genera PedidosService. */
export const ParseTokenQrPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('Token QR inválido'),
});
