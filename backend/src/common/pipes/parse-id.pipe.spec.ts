import { BadRequestException } from '@nestjs/common';
import { ID_MAXIMO, ParseIdPipe, ParseTokenQrPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it.each([
    ['1', 1],
    ['42', 42],
    [String(ID_MAXIMO), ID_MAXIMO],
  ])('acepta el ID %s', (valor, esperado) => {
    expect(pipe.transform(valor)).toBe(esperado);
  });

  it.each([
    ['0', 'cero'],
    [String(ID_MAXIMO + 1), 'fuera del rango de integer'],
    ['8286926189519109746', 'enorme (hallazgo de ZAP)'],
    ['-5', 'negativo'],
    ['1.2', 'decimal'],
    ['abc', 'texto'],
    ['', 'vacío'],
  ])('rechaza con 400 el ID %s (%s)', (valor) => {
    expect(() => pipe.transform(valor)).toThrow(BadRequestException);
  });
});

describe('ParseTokenQrPipe', () => {
  const meta = { type: 'param' as const, data: 'token' };

  it('acepta un UUID v4', async () => {
    const token = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';
    await expect(ParseTokenQrPipe.transform(token, meta)).resolves.toBe(token);
  });

  it.each([
    ['\u0000', 'byte nulo (hallazgo de ZAP)'],
    ['abc', 'texto'],
    ['3f2b8c1e-9d4a-1f6b-8e2a-1c5d7e9f0a3b', 'UUID de otra versión'],
  ])('rechaza con 400 el token %j (%s)', async (token) => {
    await expect(ParseTokenQrPipe.transform(token, meta)).rejects.toThrow(
      'Token QR inválido',
    );
  });
});
