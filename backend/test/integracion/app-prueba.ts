/**
 * Arma la API real para las pruebas de integración: ValidationPipe, SupabaseGuard, controladores,
 * servicios y TypeORM contra un PostgreSQL de prueba (Docker). Solo Supabase Auth se reemplaza por
 * un doble, para no crear cuentas reales.
 *
 * Base de datos: docker run -d --name remi-test-db -e POSTGRES_PASSWORD=remi_test
 *                -e POSTGRES_DB=remi_test -p 55432:5432 postgres:17-alpine
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { MenuModule } from '../../src/modules/menu/menu.module';
import { PedidosModule } from '../../src/modules/pedidos/pedidos.module';
import { SupabaseAdminService } from '../../src/modules/auth/supabase-admin.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { MenuService } from '../../src/modules/menu/menu.service';
import { PedidosService } from '../../src/modules/pedidos/pedidos.service';
import { cabecerasSeguridad } from '../../src/common/cabeceras-seguridad';
import { BaseDatosNoDisponibleFilter } from '../../src/common/filtros/base-datos-no-disponible.filter';
import {
  RolStaff,
  UserStaff,
} from '../../src/modules/auth/entities/user-staff.entity';
import { Cliente } from '../../src/modules/auth/entities/cliente.entity';
import { Categoria } from '../../src/modules/menu/entities/categoria.entity';

export const TEST_DB_URL =
  process.env.TEST_DB_URL ??
  'postgres://postgres:remi_test@localhost:55432/remi_test';

/** Cuerpo de una respuesta HTTP de la API. */
export type Cuerpo = {
  message?: string | string[];
  id?: number;
  [campo: string]: unknown;
};

/** Tokens de prueba que entiende el doble de Supabase. */
export const TOKENS = {
  admin: 'token-admin',
  cliente: 'token-cliente',
};

/** Doble de SupabaseAdminService: crea usuarios en memoria y valida los tokens de prueba. */
export class SupabaseDoble {
  correos = new Set<string>();
  fallarCreacion: string | null = null;
  admin = {
    createUser: jest.fn(({ email }: { email: string }) => {
      if (this.fallarCreacion)
        return Promise.resolve({
          data: null,
          error: { message: this.fallarCreacion },
        });
      if (this.correos.has(email))
        return Promise.resolve({
          data: null,
          error: {
            message:
              'A user with this email address has already been registered',
          },
        });
      this.correos.add(email);
      return Promise.resolve({
        data: { user: { id: `uid-${this.correos.size}` } },
        error: null,
      });
    }),
    deleteUser: jest.fn(() => Promise.resolve({ error: null })),
    updateUserById: jest.fn(() => Promise.resolve({ error: null })),
  };
  verifyToken(token: string) {
    const usuarios: Record<string, { id: string; email: string }> = {
      [TOKENS.admin]: { id: 'uid-admin', email: 'admin@remi.test' },
      [TOKENS.cliente]: { id: 'uid-cliente', email: 'cliente@remi.test' },
    };
    const u = usuarios[token];
    if (!u) return Promise.reject(new Error('token inválido'));
    return Promise.resolve({ ...u, user_metadata: {}, app_metadata: {} });
  }
}

export interface Contexto {
  app: INestApplication;
  supabase: SupabaseDoble;
  ds: DataSource;
  repo<T extends object>(entidad: new () => T): Repository<T>;
}

/** Servicios que se pueden reemplazar por simulaciones (integración descendente). */
export interface Simulados {
  AuthService?: object;
  MenuService?: object;
  PedidosService?: object;
}

/** Módulos del árbol funcional que se pueden montar (B, C y D). */
export const MODULOS = { AuthModule, MenuModule, PedidosModule };

export async function crearApp(
  simulados: Simulados = {},
  modulos: Array<(typeof MODULOS)[keyof typeof MODULOS]> = Object.values(
    MODULOS,
  ),
): Promise<Contexto> {
  const supabase = new SupabaseDoble();
  let builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: TEST_DB_URL,
        autoLoadEntities: true,
        synchronize: true,
        dropSchema: true,
      }),
      ...modulos,
    ],
  })
    .overrideProvider(SupabaseAdminService)
    .useValue(supabase);
  const clases = { AuthService, MenuService, PedidosService };
  for (const [nombre, valor] of Object.entries(simulados)) {
    builder = builder
      .overrideProvider(clases[nombre as keyof Simulados])
      .useValue(valor);
  }
  const modulo = await builder.compile();

  const app = modulo.createNestApplication();
  // Misma configuración que src/main.ts
  app.use(cabecerasSeguridad);
  app.useGlobalFilters(
    new BaseDatosNoDisponibleFilter(app.get(HttpAdapterHost).httpAdapter),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api');
  await app.init();

  const ds = modulo.get(DataSource);
  const repo = <T extends object>(entidad: new () => T) =>
    modulo.get<Repository<T>>(getRepositoryToken(entidad));
  return { app, supabase, ds, repo };
}

/** Datos base: un administrador, un cliente y una categoría. */
export async function sembrar(ctx: Contexto) {
  await ctx.repo(UserStaff).save({
    supabase_uid: 'uid-admin',
    nombre: 'Administrador Prueba',
    correo: 'admin@remi.test',
    rol: RolStaff.ADMIN,
  });
  await ctx.repo(Cliente).save({
    supabase_uid: 'uid-cliente',
    nombre: 'Cliente de Prueba',
    correo: 'cliente@remi.test',
  });
  // La categoría solo existe si el módulo Menú está montado.
  let categorias: Repository<Categoria>;
  try {
    categorias = ctx.repo(Categoria);
  } catch {
    return { categoriaId: 0 };
  }
  const cat = await categorias.save({ nombre: 'Platos fuertes' });
  return { categoriaId: cat.id };
}
