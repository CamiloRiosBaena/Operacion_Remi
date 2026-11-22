/**
 * Integración incremental DESCENDENTE primero en profundidad sobre el esquema principal de Remi.
 *
 *   #1  (A,B) (B,I) (B,K)
 *   #2  (A,C) (C,N) (N,AE) (C,O) (O,AI)
 *   #3  (A,D) (D,T) (T,BD)
 *
 * El módulo de control principal es el Sistema Remi (A): la aplicación NestJS con el prefijo /api,
 * el ValidationPipe, los guards y los controladores. Los módulos que todavía no se integran se
 * reemplazan por resguardos (stubs) que devuelven datos fijos con el formato del servicio real:
 *   R-C → MenuService     R-D → PedidosService
 * En cada paso se reemplaza un resguardo por el módulo real (servicio + repositorios + PostgreSQL)
 * y se repiten las pruebas de los pasos anteriores (regresión).
 */
import request from 'supertest';
import { App } from 'supertest/types';
import {
  Contexto,
  Cuerpo,
  Simulados,
  TOKENS,
  crearApp,
  sembrar,
} from './app-prueba';
import { Mesa } from '../../src/modules/mesas/entities/mesa.entity';
import { Ingrediente } from '../../src/modules/menu/entities/ingrediente.entity';
import { Cliente } from '../../src/modules/auth/entities/cliente.entity';
import { UserStaff } from '../../src/modules/auth/entities/user-staff.entity';

const admin = { Authorization: `Bearer ${TOKENS.admin}` };
const cliente = { Authorization: `Bearer ${TOKENS.cliente}` };

/** R-C: resguardo del módulo Menú. */
function resguardoC() {
  return {
    findAllPlatos: jest.fn(() => Promise.resolve([])),
    createPlato: jest.fn((dto: object) => Promise.resolve({ id: 200, ...dto })),
    createIngrediente: jest.fn((dto: object) =>
      Promise.resolve({ id: 300, ...dto }),
    ),
  };
}
/** R-D: resguardo del módulo Pedidos y Mesas. */
function resguardoD() {
  return {
    findAllMesas: jest.fn(() => Promise.resolve([])),
    createMesa: jest.fn((numero: number) =>
      Promise.resolve({ id: 400, numero, estado: 'libre' }),
    ),
  };
}

const datos = {
  registro: {
    nombre: 'Andres Gutierrez',
    correo: 'andres@gmail.com',
    contrasena: 'Clave1234',
  },
  staff: {
    nombre: 'Maria Domiciliaria',
    correo: 'maria@remi.test',
    contrasena: 'Clave1234',
    rol: 'domiciliario',
  },
  plato: (categoriaId: number) => ({
    nombre: 'Ajiaco Colombiano',
    precio: 15000,
    tasaIva: 0.05,
    categoriaId,
  }),
  ingrediente: { nombre: 'Aguacate', unidadCompra: 'Kg', gramosPorUnidad: 200 },
};

/** Monta el Sistema Remi (A) con los resguardos indicados. */
async function montar(simulados: Simulados) {
  const ctx = await crearApp(simulados);
  const { categoriaId } = await sembrar(ctx);
  return { ctx, http: ctx.app.getHttpServer() as App, categoriaId };
}

describe('INTEGRACIÓN DESCENDENTE (primero en profundidad)', () => {
  describe('#1 (A,B) (B,I) (B,K): Autenticación real; Menú y Mesas con los resguardos R-C y R-D (DES-1)', () => {
    let ctx: Contexto, http: App, categoriaId: number;
    const rc = resguardoC(),
      rd = resguardoD();

    beforeAll(async () => {
      ({ ctx, http, categoriaId } = await montar({
        MenuService: rc,
        PedidosService: rd,
      }));
    });
    afterAll(() => ctx.app.close());

    it('DES-1.1 - (A,B): el RolesGuard real de B autoriza al administrador y A entrega la petición a R-D (201)', async () => {
      await request(http)
        .post('/api/pedidos/mesas')
        .set(admin)
        .send({ numero: '4' })
        .expect(201);
      expect(rd.createMesa).toHaveBeenCalledWith(4);
    });

    it('DES-1.2 - (A,B): el RolesGuard real de B niega al cliente (403) y R-C no se llama', async () => {
      await request(http)
        .post('/api/menu/platos')
        .set(cliente)
        .send(datos.plato(categoriaId))
        .expect(403);
      expect(rc.createPlato).not.toHaveBeenCalled();
    });

    it('DES-1.3 - (B,I): el registro crea la cuenta en Auth y el cliente en PostgreSQL (201)', async () => {
      await request(http)
        .post('/api/auth/registro')
        .send(datos.registro)
        .expect(201);
      expect(
        await ctx.repo(Cliente).findOneBy({ correo: 'andres@gmail.com' }),
      ).not.toBeNull();
      expect(ctx.supabase.admin.createUser).toHaveBeenCalled();
    });

    it('DES-1.4 - (B,K): el administrador crea el staff y se guarda con su rol (201)', async () => {
      await request(http)
        .post('/api/auth/staff')
        .set(admin)
        .send(datos.staff)
        .expect(201);
      expect(
        await ctx.repo(UserStaff).findOneBy({ correo: 'maria@remi.test' }),
      ).toMatchObject({ rol: 'domiciliario' });
    });

    it('DES-1.5 - (B,K): un cliente no puede crear staff (403)', async () => {
      await request(http)
        .post('/api/auth/staff')
        .set(cliente)
        .send({ ...datos.staff, correo: 'otra@remi.test' })
        .expect(403);
    });
  });

  describe('#2 (A,C) (C,N) (N,AE) (C,O) (O,AI): se reemplaza R-C por el módulo Menú real (DES-2)', () => {
    let ctx: Contexto, http: App, categoriaId: number;
    const rd = resguardoD();

    beforeAll(async () => {
      ({ ctx, http, categoriaId } = await montar({ PedidosService: rd }));
    });
    afterAll(() => ctx.app.close());

    it('DES-2.1 - (A,C): A enruta /api/menu al módulo real: GET /api/menu/platos responde 200 con la lista vacía', async () => {
      const g = await request(http).get('/api/menu/platos').expect(200);
      expect(g.body).toEqual([]);
    });

    it('DES-2.2 - (C,N) (N,AE): el plato se guarda y GET /api/menu/platos/:id lo devuelve (201 y 200)', async () => {
      const r = await request(http)
        .post('/api/menu/platos')
        .set(admin)
        .send(datos.plato(categoriaId))
        .expect(201);
      const g = await request(http)
        .get(`/api/menu/platos/${(r.body as Cuerpo).id}`)
        .expect(200);
      expect(g.body as Cuerpo).toMatchObject({ nombre: 'Ajiaco Colombiano' });
    });

    it('DES-2.3 - (N,AE): con la categoría 999, que no existe, responde 400', async () => {
      const r = await request(http)
        .post('/api/menu/platos')
        .set(admin)
        .send(datos.plato(999))
        .expect(400);
      expect((r.body as Cuerpo).message).toBe('Categoría 999 no encontrada');
    });

    it('DES-2.4 - (C,O) (O,AI): el ingrediente válido se guarda en PostgreSQL (201)', async () => {
      const r = await request(http)
        .post('/api/menu/ingredientes')
        .set(admin)
        .send(datos.ingrediente)
        .expect(201);
      expect(
        await ctx.repo(Ingrediente).findOneBy({ id: (r.body as Cuerpo).id }),
      ).toMatchObject({ nombre: 'Aguacate', unidadCompra: 'Kg' });
    });

    it('DES-2.5 - (O,AI): la unidad "kg" en minúscula se rechaza (400)', async () => {
      await request(http)
        .post('/api/menu/ingredientes')
        .set(admin)
        .send({ ...datos.ingrediente, unidadCompra: 'kg' })
        .expect(400);
    });

    it('DES-2.6 - Regresión de #1: B responde (201) y D sigue con su resguardo R-D', async () => {
      await request(http)
        .post('/api/auth/registro')
        .send(datos.registro)
        .expect(201);
      await request(http)
        .post('/api/pedidos/mesas')
        .set(admin)
        .send({ numero: 4 })
        .expect(201);
      expect(rd.createMesa).toHaveBeenCalledWith(4);
    });
  });

  describe('#3 (A,D) (D,T) (T,BD): se reemplaza R-D por el módulo Pedidos y Mesas real; ya no quedan resguardos (DES-3)', () => {
    let ctx: Contexto, http: App, categoriaId: number;

    beforeAll(async () => {
      ({ ctx, http, categoriaId } = await montar({}));
    });
    afterAll(() => ctx.app.close());

    it('DES-3.1 - (A,D): A enruta /api/pedidos al módulo real: GET /api/pedidos/mesas/todas responde 200 con la lista vacía', async () => {
      const g = await request(http).get('/api/pedidos/mesas/todas').expect(200);
      expect(g.body).toEqual([]);
    });

    it('DES-3.2 - (D,T) (T,BD): el número "4" se convierte y la mesa se guarda en PostgreSQL (201)', async () => {
      await request(http)
        .post('/api/pedidos/mesas')
        .set(admin)
        .send({ numero: '4' })
        .expect(201);
      expect(await ctx.repo(Mesa).findOneBy({ numero: 4 })).not.toBeNull();
    });

    it('DES-3.3 - (T,BD): la mesa repetida se rechaza con "La mesa 4 ya existe" (400)', async () => {
      const r = await request(http)
        .post('/api/pedidos/mesas')
        .set(admin)
        .send({ numero: 4 })
        .expect(400);
      expect((r.body as Cuerpo).message).toBe('La mesa 4 ya existe');
    });

    it('DES-3.4 - Regresión final: las cinco funciones responden con todos los módulos reales', async () => {
      await request(http)
        .post('/api/auth/registro')
        .send(datos.registro)
        .expect(201);
      await request(http)
        .post('/api/auth/staff')
        .set(admin)
        .send(datos.staff)
        .expect(201);
      await request(http)
        .post('/api/menu/platos')
        .set(admin)
        .send(datos.plato(categoriaId))
        .expect(201);
      await request(http)
        .post('/api/menu/ingredientes')
        .set(admin)
        .send(datos.ingrediente)
        .expect(201);
      await request(http)
        .post('/api/pedidos/mesas')
        .set(admin)
        .send({ numero: 8 })
        .expect(201);
      expect(await ctx.repo(Mesa).count()).toBe(2); // mesas 4 y 8
    });
  });
});
