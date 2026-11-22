import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * La API solo responde JSON: no necesita cargar scripts, estilos ni marcos,
 * así que su CSP lo bloquea todo. frame-ancestors, form-action y base-uri no
 * heredan de default-src, por eso se declaran aparte.
 */
const cabecerasApi = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
      baseUri: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
});

/** Swagger UI (/docs) es una página web: necesita sus scripts y estilos en línea. */
const cabecerasDocs = helmet({
  contentSecurityPolicy: {
    directives: {
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
    },
  },
});

/** Cabeceras de seguridad (CSP, anti-clickjacking, nosniff) y sin X-Powered-By. */
export function cabecerasSeguridad(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const esDocs = req.path === '/docs' || req.path.startsWith('/docs/');
  return (esDocs ? cabecerasDocs : cabecerasApi)(req, res, next);
}
