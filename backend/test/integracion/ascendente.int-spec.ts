/**
 * Integración incremental ASCENDENTE (desde las hojas) sobre el esquema principal de Remi.
 *
 *   #1  I, K, AE, AI, BD                      → hojas: cada función con su conductor
 *   #2  (N,AE) (O,AI) (T,BD)                  → cada función con su sub-recurso
 *   #3  (B,I) (B,K) (C,N) (C,O) (D,T)         → cada módulo con sus hijos
 *   #4  (A,B) (A,C) (A,D)                     → el Sistema con sus módulos
 *
 * Conductores: en #1 un caso de Jest que llama al servicio; desde #2, Supertest (peticiones HTTP).
 * En Remi, N (Platos), O (Ingredientes) y T (Mesas) son grupos de rutas del controlador de su
 * módulo, por eso en #2 el conductor solo envía peticiones a las rutas de cada sub-recurso.
 */
import request from 'supertest';
import { App } from 'supertest/types';
import { BadRequestException } from '@nestjs/common';
import {
  Contexto,
  Cuerpo,
  MODULOS,
  TOKENS,
  crearApp,
  sembrar,
} from './app-prueba';
import { Mesa } from '../../src/modules/mesas/entities/mesa.entity';
import { Ingrediente } from '../../src/modules/menu/entities/ingrediente.entity';
import { Cliente } from '../../src/modules/auth/entities/cliente.entity';
import {
  RolStaff,
  UserStaff,
} from '../../src/modules/auth/entities/user-staff.entity';
import { PedidosService } from '../../src/modules/pedidos/pedidos.service';
import { MenuService } from '../../src/modules/menu/menu.service';
import { AuthService } from '../../src/modules/auth/auth.service';

const admin = { Authorization: `Bearer ${TOKENS.admin}` };
const cliente = { Authorization: `Bearer ${TOKENS.cliente}` };

/** Monta la aplicación de prueba con los módulos indicados (o con todos). */
async function montar(modulos?: Parameters<typeof crearApp>[1]) {
  const ctx = await crearApp({}, modulos);
  const { categoriaId } = await sembrar(ctx);
  return { ctx, http: ctx.app.getHttpServer() as App, categoriaId };
}

describe('INTEGRACIÓN ASCENDENTE', () => {
  describe('#1 Hojas: I, K, AE, AI, BD (ASC-1)', () => {
    let ctx: Contexto;
    let categoriaId: number;

    beforeAll(async () => {
      ({ ctx, categoriaId } = await montar());
    });
    afterAll(() => ctx.app.close());

    it('ASC-1.1 - BD: el repositorio y PostgreSQL rechazan dos mesas con el mismo número', async () => {
      const repo = ctx.repo(Mesa);
      await repo.save(repo.create({ numero: 90 }));
      await expect(repo.save(repo.create({ numero: 90 }))).rejects.toThrow(
        /duplicate key/,
      );
    });

    it('ASC-1.2 - BD: PedidosService.createMesa guarda la mesa y rechaza un número repetido', async () => {
      const svc = ctx.app.get(PedidosService);
      const mesa = await svc.createMesa(5);
      expect(mesa.id).toBeDefined();
      await expect(svc.createMesa(5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('ASC-1.3 - AI: un ingrediente sin unidad se guarda con "Kg" por defecto', async () => {
      const svc = ctx.app.get(MenuService);
      const ing = await svc.createIngrediente({
        nombre: 'Sal marina',
        gramosPorUnidad: 1000,
      });
      expect(
        (await ctx.repo(Ingrediente).findOneByOrFail({ id: ing.id }))
          .unidadCompra,
      ).toBe('Kg');
    });

    it('ASC-1.4 - AE: MenuService.createPlato guarda el plato con su categoría y rechaza una inexistente', async () => {
      const svc = ctx.app.get(MenuService);
      const plato = await svc.createPlato({
        nombre: 'Bandeja Paisa',
        precio: 15000,
        tasaIva: 0.19,
        categoriaId,
      });
      expect(plato.categoria.nombre).toBe('Platos fuertes');
      await expect(
        svc.createPlato({
          nombre: 'Bandeja Paisa',
          precio: 15000,
          categoriaId: 999,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ASC-1.5 - I: AuthService.registroCliente crea la cuenta en Auth y el perfil en la BD', async () => {
      const svc = ctx.app.get(AuthService);
      const c = await svc.registroCliente({
        nombre: 'Laura Martinez',
        correo: 'laura@gmail.com',
        contrasena: 'Clave1234',
      });
      expect(await ctx.repo(Cliente).findOneBy({ id: c.id })).toMatchObject({
        correo: 'laura@gmail.com',
      });
      expect(ctx.supabase.admin.createUser).toHaveBeenCalled();
    });

    it('ASC-1.6 - K: AuthService.createStaff crea la cuenta en Auth y guarda el rol en la BD', async () => {
      const svc = ctx.app.get(AuthService);
      const s = await svc.createStaff({
        nombre: 'Pedro Cocinero',
        correo: 'pedro@remi.test',
        contrasena: 'Clave1234',
        rol: RolStaff.COCINERO,
      });
      expect(await ctx.repo(UserStaff).findOneBy({ id: s.id })).toMatchObject({
        rol: 'cocinero',
      });
    });
  });

  describe('#2 (N,AE) (O,AI) (T,BD) (ASC-2)', () => {
    describe('(N,AE) y (O,AI): rutas de Platos e Ingredientes', () => {
      let ctx: Contexto, http: App, categoriaId: number;

      beforeAll(async () => {
        ({ ctx, http, categoriaId } = await montar([MODULOS.MenuModule]));
      });
      afterAll(() => ctx.app.close());

      it('ASC-2.1 - (N,AE): POST /api/menu/platos sin token responde 401', async () => {
        await request(http)
          .post('/api/menu/platos')
          .send({ nombre: 'Plato sin token', precio: 1000, categoriaId })
          .expect(401);
      });

      it('ASC-2.2 - (N,AE): POST /api/menu/platos responde 201 y GET /api/menu/platos/:id lo devuelve', async () => {
        const r = await request(http)
          .post('/api/menu/platos')
          .set(admin)
          .send({
            nombre: 'Ajiaco Colombiano',
            precio: 15000,
            tasaIva: 0.05,
            categoriaId,
          })
          .expect(201);
        const g = await request(http)
          .get(`/api/menu/platos/${(r.body as Cuerpo).id}`)
          .expect(200);
        expect(g.body as Cuerpo).toMatchObject({
          nombre: 'Ajiaco Colombiano',
        });
      });

      it('ASC-2.3 - (O,AI): POST /api/menu/ingredientes sin token responde 401', async () => {
        await request(http)
          .post('/api/menu/ingredientes')
          .send({
            nombre: 'Ingrediente sin token',
            unidadCompra: 'Kg',
            gramosPorUnidad: 1000,
          })
          .expect(401);
      });

      it('ASC-2.4 - (O,AI): la unidad "kg" en minúscula se rechaza (400)', async () => {
        const r = await request(http)
          .post('/api/menu/ingredientes')
          .set(admin)
          .send({
            nombre: 'Aguacate',
            unidadCompra: 'kg',
            gramosPorUnidad: 200,
          })
          .expect(400);
        expect((r.body as Cuerpo).message).toContain(
          'La unidad de compra debe ser Kg, Caja o Bulto',
        );
      });

      it('ASC-2.5 - (O,AI): POST /api/menu/ingredientes responde 201 y GET /api/menu/ingredientes/:id lo devuelve', async () => {
        const r = await request(http)
          .post('/api/menu/ingredientes')
          .set(admin)
          .send({
            nombre: 'Aguacate',
            unidadCompra: 'Kg',
            gramosPorUnidad: 200,
          })
          .expect(201);
        const g = await request(http)
          .get(`/api/menu/ingredientes/${(r.body as Cuerpo).id}`)
          .set(admin)
          .expect(200);
        expect(g.body as Cuerpo).toMatchObject({
          nombre: 'Aguacate',
          unidadCompra: 'Kg',
        });
      });
    });

    describe('(T,BD): rutas de Mesas', () => {
      let ctx: Contexto, http: App;

      beforeAll(async () => {
        ({ ctx, http } = await montar([MODULOS.PedidosModule]));
      });
      afterAll(() => ctx.app.close());

      it('ASC-2.6 - (T,BD): POST /api/pedidos/mesas sin token responde 401', async () => {
        await request(http)
          .post('/api/pedidos/mesas')
          .send({ numero: 77 })
          .expect(401);
      });

      it('ASC-2.7 - (T,BD): el número "4" se convierte y la mesa 4 se guarda (201)', async () => {
        await request(http)
          .post('/api/pedidos/mesas')
          .set(admin)
          .send({ numero: '4' })
          .expect(201);
        expect(await ctx.repo(Mesa).findOneBy({ numero: 4 })).not.toBeNull();
      });

      it('ASC-2.8 - (T,BD): el número 0 responde 400 y no se guarda', async () => {
        await request(http)
          .post('/api/pedidos/mesas')
          .set(admin)
          .send({ numero: 0 })
          .expect(400);
        expect(await ctx.repo(Mesa).findOneBy({ numero: 0 })).toBeNull();
      });

      it('ASC-2.9 - (T,BD): un número repetido responde 400 "La mesa 4 ya existe"', async () => {
        const r = await request(http)
          .post('/api/pedidos/mesas')
          .set(admin)
          .send({ numero: 4 })
          .expect(400);
        expect((r.body as Cuerpo).message).toBe('La mesa 4 ya existe');
      });
    });
  });

  describe('#3 (B,I) (B,K) (C,N) (C,O) (D,T) (ASC-3)', () => {
    describe('(B,I) (B,K): módulo Autenticación', () => {
      let ctx: Contexto, http: App;

      beforeAll(async () => {
        ({ ctx, http } = await montar([MODULOS.AuthModule]));
      });
      afterAll(() => ctx.app.close());

      it('ASC-3.1 - (B,I): POST /api/auth/registro con datos válidos responde 201', async () => {
        await request(http)
          .post('/api/auth/registro')
          .send({
            nombre: 'Andres Gutierrez',
            correo: 'andres@gmail.com',
            contrasena: 'Clave1234',
          })
          .expect(201);
      });

      it('ASC-3.2 - (B,I): datos no válidos responden 400 con mensajes en español', async () => {
        const r = await request(http)
          .post('/api/auth/registro')
          .send({ nombre: 'Ana', correo: 'ana', contrasena: '123' })
          .expect(400);
        expect((r.body as Cuerpo).message).toEqual(
          expect.arrayContaining([
            'El nombre debe tener entre 10 y 30 caracteres',
            'La contraseña debe tener entre 8 y 20 caracteres',
          ]),
        );
      });

      it('ASC-3.3 - (B,K): POST /api/auth/staff sin token responde 401', async () => {
        await request(http)
          .post('/api/auth/staff')
          .send({
            nombre: 'Pedro Cocinero',
            correo: 'pedro@remi.test',
            contrasena: 'Clave1234',
            rol: 'cocinero',
          })
          .expect(401);
      });

      it('ASC-3.4 - (B,K): un cliente autenticado no puede crear staff (403)', async () => {
        await request(http)
          .post('/api/auth/staff')
          .set(cliente)
          .send({
            nombre: 'Intruso Admin',
            correo: 'intruso@remi.test',
            contrasena: 'Clave1234',
            rol: 'admin',
          })
          .expect(403);
      });

      it('ASC-3.5 - (B,K): un rol fuera del dominio responde 400', async () => {
        const r = await request(http)
          .post('/api/auth/staff')
          .set(admin)
          .send({
            nombre: 'Pedro Cocinero',
            correo: 'pedro@remi.test',
            contrasena: 'Clave1234',
            rol: 'cliente',
          })
          .expect(400);
        expect((r.body as Cuerpo).message).toContain(
          'El rol debe ser admin, cocinero o domiciliario',
        );
      });

      it('ASC-3.6 - (B,K): con token de administrador responde 201 y guarda el staff con su rol', async () => {
        await request(http)
          .post('/api/auth/staff')
          .set(admin)
          .send({
            nombre: 'Maria Domiciliaria',
            correo: 'maria@remi.test',
            contrasena: 'Clave1234',
            rol: 'domiciliario',
          })
          .expect(201);
        expect(
          await ctx.repo(UserStaff).findOneBy({ correo: 'maria@remi.test' }),
        ).toMatchObject({ rol: 'domiciliario' });
      });
    });

    describe('(C,N) (C,O): módulo Menú, Platos con Ingredientes', () => {
      let ctx: Contexto, http: App, categoriaId: number;
      let platoId: number, ingredienteId: number;

      beforeAll(async () => {
        ({ ctx, http, categoriaId } = await montar([MODULOS.MenuModule]));
        platoId = (
          (
            await request(http)
              .post('/api/menu/platos')
              .set(admin)
              .send({ nombre: 'Ajiaco Colombiano', precio: 15000, categoriaId })
          ).body as Cuerpo
        ).id as number;
        ingredienteId = (
          (
            await request(http).post('/api/menu/ingredientes').set(admin).send({
              nombre: 'Papa criolla',
              unidadCompra: 'Kg',
              gramosPorUnidad: 1000,
            })
          ).body as Cuerpo
        ).id as number;
      });
      afterAll(() => ctx.app.close());

      it('ASC-3.7 - (C,N) (C,O): el plato se asocia con el ingrediente y la consulta del plato lo incluye', async () => {
        await request(http)
          .post(`/api/menu/platos/${platoId}/ingredientes`)
          .set(admin)
          .send({ ingredienteId, gramosPorPorcion: 150 })
          .expect(201);
        const g = await request(http)
          .get(`/api/menu/platos/${platoId}`)
          .expect(200);
        const pis = (
          g.body as {
            platoIngredientes: {
              gramosPorPorcion: string; // columna decimal: PostgreSQL la devuelve como texto
              ingrediente: { nombre: string };
            }[];
          }
        ).platoIngredientes;
        expect(pis).toHaveLength(1);
        expect(Number(pis[0].gramosPorPorcion)).toBe(150);
        expect(pis[0].ingrediente.nombre).toBe('Papa criolla');
      });

      it('ASC-3.8 - (C,N) (C,O): asociar un ingrediente inexistente responde 404', async () => {
        const r = await request(http)
          .post(`/api/menu/platos/${platoId}/ingredientes`)
          .set(admin)
          .send({ ingredienteId: 999, gramosPorPorcion: 150 })
          .expect(404);
        expect((r.body as Cuerpo).message).toBe(
          'Ingrediente 999 no encontrado',
        );
      });
    });

    describe('(D,T): módulo Pedidos y Mesas', () => {
      let ctx: Contexto, http: App;

      beforeAll(async () => {
        ({ ctx, http } = await montar([MODULOS.PedidosModule]));
      });
      afterAll(() => ctx.app.close());

      it('ASC-3.9 - (D,T): la mesa creada aparece en GET /api/pedidos/mesas/todas', async () => {
        await request(http)
          .post('/api/pedidos/mesas')
          .set(admin)
          .send({ numero: 12 })
          .expect(201);
        const g = await request(http)
          .get('/api/pedidos/mesas/todas')
          .expect(200);
        expect(g.body).toEqual([
          expect.objectContaining({ numero: 12, estado: 'libre' }),
        ]);
      });
    });
  });

  describe('#4 (A,B) (A,C) (A,D): el Sistema con sus módulos (ASC-4)', () => {
    let ctx: Contexto, http: App, categoriaId: number;

    beforeAll(async () => {
      ({ ctx, http, categoriaId } = await montar());
    });
    afterAll(() => ctx.app.close());

    it('ASC-4.1 - (A,B): el Sistema atiende el registro de cliente y la creación de staff', async () => {
      await request(http)
        .post('/api/auth/registro')
        .send({
          nombre: 'Andres Gutierrez',
          correo: 'andres@gmail.com',
          contrasena: 'Clave1234',
        })
        .expect(201);
      await request(http)
        .post('/api/auth/staff')
        .set(admin)
        .send({
          nombre: 'Maria Domiciliaria',
          correo: 'maria@remi.test',
          contrasena: 'Clave1234',
          rol: 'domiciliario',
        })
        .expect(201);
    });

    it('ASC-4.2 - (A,C): el RolesGuard de B protege a C: cliente 403 y administrador 201 al crear un plato', async () => {
      const plato = { nombre: 'Ajiaco Colombiano', precio: 15000, categoriaId };
      await request(http)
        .post('/api/menu/platos')
        .set(cliente)
        .send(plato)
        .expect(403);
      await request(http)
        .post('/api/menu/platos')
        .set(admin)
        .send(plato)
        .expect(201);
    });

    it('ASC-4.3 - (A,D): el RolesGuard de B protege a D: cliente 403 y administrador 201 al crear una mesa', async () => {
      await request(http)
        .post('/api/pedidos/mesas')
        .set(cliente)
        .send({ numero: 8 })
        .expect(403);
      await request(http)
        .post('/api/pedidos/mesas')
        .set(admin)
        .send({ numero: 8 })
        .expect(201);
    });

    it('ASC-4.4 - (A,B) (A,C) (A,D): los registros de los tres módulos quedan en la misma base de datos', async () => {
      await request(http)
        .post('/api/menu/ingredientes')
        .set(admin)
        .send({ nombre: 'Aguacate', unidadCompra: 'Kg', gramosPorUnidad: 200 })
        .expect(201);
      expect(await ctx.repo(Cliente).count()).toBe(2); // sembrado + Andres
      expect(await ctx.repo(UserStaff).count()).toBe(2); // admin + Maria
      expect(await ctx.repo(Mesa).count()).toBe(1);
      expect(await ctx.repo(Ingrediente).count()).toBe(1);
    });
  });
});
