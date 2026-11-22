/**
 * Métricas de seguridad (sección 3.3): barrido automático de TODAS las rutas de la API.
 *
 *  EISA     (autenticidad)    = rutas privadas que rechazan la petición sin token o con un token falso (401)
 *                               / total de rutas privadas
 *  TEV-RBAC (responsabilidad) = rutas con rol de personal que rechazan a un cliente autenticado (403)
 *                               / total de rutas con rol
 *
 * Las rutas no se escriben a mano: se descubren leyendo los decoradores de los controladores
 * (@Get, @Post..., @UseGuards y @SoloRoles), así el total es el real de la API.
 * Ejecutar: npx jest --config ./test/integracion/jest-integracion.json --testRegex "sec-spec.ts$"
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { Contexto, TOKENS, crearApp, sembrar } from './app-prueba';
import { MenuModule } from '../../src/modules/menu/menu.module';
import { PedidosModule } from '../../src/modules/pedidos/pedidos.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { CocinaModule } from '../../src/modules/cocina/cocina.module';
import { DomiciliosModule } from '../../src/modules/domicilios/domicilios.module';
import { MesasModule } from '../../src/modules/mesas/mesas.module';
import { PagosModule } from '../../src/modules/pagos/pagos.module';
import { AsistenteModule } from '../../src/modules/asistente/asistente.module';
import { SupabaseGuard } from '../../src/modules/auth/supabase.guard';
import { ROLES_KEY } from '../../src/modules/auth/roles.guard';

// Los servicios externos no se llaman en el barrido (los guards responden antes),
// pero sus clientes necesitan una clave para construirse.
process.env.GROQ_API_KEY ??= 'clave-de-prueba';

interface Ruta {
  metodo: string;
  ruta: string;
  privada: boolean;
  roles: string[];
}

const METODOS: Record<number, string> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.DELETE]: 'delete',
};

/** Reemplaza los parámetros de ruta por valores válidos para que la petición llegue al guard. */
function concreta(ruta: string): string {
  return ruta
    .replace(/:token/g, '3f2b8c1e-5d4a-4c3b-9a8e-7f6d5c4b3a21')
    .replace(/:[A-Za-z]+/g, '1');
}

function descubrir(ctx: Contexto): Ruta[] {
  const rutas: Ruta[] = [];
  const modulos = ctx.app.get(ModulesContainer);
  for (const modulo of modulos.values()) {
    for (const wrapper of modulo.controllers.values()) {
      const clase = wrapper.metatype as new (...args: unknown[]) => unknown;
      if (!clase) continue;
      const base = String(Reflect.getMetadata(PATH_METADATA, clase) ?? '');
      const guardsClase: unknown[] = Reflect.getMetadata(GUARDS_METADATA, clase) ?? [];
      const rolesClase: string[] = Reflect.getMetadata(ROLES_KEY, clase) ?? [];
      const proto = clase.prototype as Record<string, unknown>;
      for (const nombre of Object.getOwnPropertyNames(proto)) {
        const fn = proto[nombre];
        if (nombre === 'constructor' || typeof fn !== 'function') continue;
        const verbo = Reflect.getMetadata(METHOD_METADATA, fn) as number | undefined;
        const sub = Reflect.getMetadata(PATH_METADATA, fn) as string | undefined;
        if (verbo === undefined || sub === undefined) continue;
        const guards: unknown[] = [...guardsClase, ...((Reflect.getMetadata(GUARDS_METADATA, fn) as unknown[]) ?? [])];
        const roles: string[] = [...rolesClase, ...((Reflect.getMetadata(ROLES_KEY, fn) as string[]) ?? [])];
        const partes = ['api', base, sub].map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean);
        rutas.push({
          metodo: METODOS[verbo],
          ruta: '/' + partes.join('/'),
          privada: guards.includes(SupabaseGuard),
          roles,
        });
      }
    }
  }
  return rutas.sort((a, b) => (a.ruta + a.metodo).localeCompare(b.ruta + b.metodo));
}

async function probar(http: App, r: Ruta, token?: string): Promise<number> {
  const metodo = r.metodo as 'get' | 'post' | 'put' | 'patch' | 'delete';
  let req = request(http)[metodo](concreta(r.ruta));
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  if (metodo !== 'get' && metodo !== 'delete') req = req.send({});
  return (await req).status;
}

describe('MÉTRICAS DE SEGURIDAD — barrido de todas las rutas de la API', () => {
  let ctx: Contexto;
  let http: App;
  let rutas: Ruta[];
  const informe: Record<string, unknown>[] = [];

  beforeAll(async () => {
    ctx = await crearApp({}, [
      MenuModule,
      PedidosModule,
      AuthModule,
      CocinaModule,
      DomiciliosModule,
      MesasModule,
      PagosModule,
      AsistenteModule,
    ] as never);
    await sembrar(ctx);
    http = ctx.app.getHttpServer() as App;
    rutas = descubrir(ctx);
  });

  afterAll(async () => {
    const privadas = rutas.filter((r) => r.privada);
    const conRol = privadas.filter((r) => r.roles.length > 0);
    const resumen = {
      rutas_totales: rutas.length,
      rutas_publicas: rutas.length - privadas.length,
      rutas_privadas: privadas.length,
      rutas_con_rol: conRol.length,
    };
    writeFileSync(
      join(__dirname, 'seguridad-rutas.json'),
      JSON.stringify({ resumen, rutas: informe }, null, 2),
    );
    console.log(JSON.stringify(resumen));
    await ctx.app.close();
  });

  it('SEG-M1 - EISA: las rutas privadas rechazan la petición SIN token (401)', async () => {
    const privadas = rutas.filter((r) => r.privada);
    const fallos: string[] = [];
    for (const r of privadas) {
      const codigo = await probar(http, r);
      informe.push({ prueba: 'sin token', metodo: r.metodo.toUpperCase(), ruta: r.ruta, codigo });
      if (codigo !== 401) fallos.push(`${r.metodo.toUpperCase()} ${r.ruta} -> ${codigo}`);
    }
    console.log(`EISA sin token: ${privadas.length - fallos.length} de ${privadas.length} rutas privadas responden 401`);
    expect(privadas.length).toBeGreaterThan(0);
    expect(fallos).toEqual([]);
  });

  it('SEG-M2 - EISA: las rutas privadas rechazan un token FALSO o alterado (401)', async () => {
    const privadas = rutas.filter((r) => r.privada);
    const fallos: string[] = [];
    for (const r of privadas) {
      const codigo = await probar(http, r, 'token-falso.firma-alterada');
      informe.push({ prueba: 'token falso', metodo: r.metodo.toUpperCase(), ruta: r.ruta, codigo });
      if (codigo !== 401) fallos.push(`${r.metodo.toUpperCase()} ${r.ruta} -> ${codigo}`);
    }
    console.log(`EISA token falso: ${privadas.length - fallos.length} de ${privadas.length} rutas privadas responden 401`);
    expect(fallos).toEqual([]);
  });

  it('SEG-M3 - TEV-RBAC: un cliente autenticado no entra a las rutas del personal (403)', async () => {
    const conRol = rutas.filter((r) => r.privada && r.roles.length > 0);
    const fallos: string[] = [];
    for (const r of conRol) {
      const codigo = await probar(http, r, TOKENS.cliente);
      informe.push({ prueba: 'token de cliente', metodo: r.metodo.toUpperCase(), ruta: r.ruta, roles: r.roles, codigo });
      if (codigo !== 403) fallos.push(`${r.metodo.toUpperCase()} ${r.ruta} -> ${codigo}`);
    }
    console.log(`TEV-RBAC: ${conRol.length - fallos.length} de ${conRol.length} rutas con rol responden 403 a un cliente`);
    expect(conRol.length).toBeGreaterThan(0);
    expect(fallos).toEqual([]);
  });
});
