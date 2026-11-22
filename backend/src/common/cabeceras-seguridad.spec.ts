import express from 'express';
import request from 'supertest';
import { cabecerasSeguridad } from './cabeceras-seguridad';

describe('cabecerasSeguridad', () => {
  const app = express();
  app.use(cabecerasSeguridad);
  app.get(['/api/menu/publico', '/docs'], (_req, res) => {
    res.send('ok');
  });

  it('aplica una CSP estricta a la API y bloquea los marcos', async () => {
    const res = await request(app).get('/api/menu/publico');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none';form-action 'none';base-uri 'none'",
    );
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('deja a Swagger (/docs) cargar sus scripts y estilos', async () => {
    const res = await request(app).get('/docs');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain('https:');
  });
});
