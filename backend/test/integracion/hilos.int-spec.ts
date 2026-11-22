/**
 * Pruebas de integración basadas en hilos: cada hilo recorre un caso de uso completo, desde la
 * petición HTTP hasta el registro en PostgreSQL, siguiendo su diagrama de secuencia.
 */
import request from 'supertest';
import { App } from 'supertest/types';
import { Contexto, Cuerpo, TOKENS, crearApp, sembrar } from './app-prueba';
import { Cliente } from '../../src/modules/auth/entities/cliente.entity';
import { UserStaff } from '../../src/modules/auth/entities/user-staff.entity';
import { Plato } from '../../src/modules/menu/entities/plato.entity';
import { Ingrediente } from '../../src/modules/menu/entities/ingrediente.entity';
import { Mesa } from '../../src/modules/mesas/entities/mesa.entity';

const admin = { Authorization: `Bearer ${TOKENS.admin}` };
const cliente = { Authorization: `Bearer ${TOKENS.cliente}` };

let ctx: Contexto;
let http: App;
let categoriaId: number;

beforeAll(async () => {
  ctx = await crearApp();
  ({ categoriaId } = await sembrar(ctx));
  http = ctx.app.getHttpServer() as App;
});
afterAll(() => ctx.app.close());

describe('HILO 1 — CU-06 Registro de cliente', () => {
  const datos = {
    nombre: 'CamiloRiosBaena',
    correo: 'camilo@gmail.com',
    contrasena: 'Clave1234',
  };

  it('HIL-01a - Datos válidos: 201, cuenta en Auth y perfil guardado (correo libre → registrado)', async () => {
    const r = await request(http)
      .post('/api/auth/registro')
      .send(datos)
      .expect(201);
    expect(r.body as Cuerpo).toMatchObject({
      nombre: datos.nombre,
      correo: datos.correo,
      estado: 'activo',
    });
    expect(
      await ctx.repo(Cliente).findOneBy({ correo: datos.correo }),
    ).not.toBeNull();
  });

  it('HIL-01b - Correo ya registrado: 400 y no se crea otra cuenta', async () => {
    const llamadas = ctx.supabase.admin.createUser.mock.calls.length;
    const r = await request(http)
      .post('/api/auth/registro')
      .send(datos)
      .expect(400);
    expect((r.body as Cuerpo).message).toBe(
      'El correo "camilo@gmail.com" ya está registrado',
    );
    expect(ctx.supabase.admin.createUser.mock.calls.length).toBe(llamadas);
  });

  it('HIL-01c - Supabase Auth falla: 400 con su mensaje y no se guarda el perfil', async () => {
    ctx.supabase.fallarCreacion = 'Email rate limit exceeded';
    await request(http)
      .post('/api/auth/registro')
      .send({ ...datos, correo: 'otro.cliente@gmail.com' })
      .expect(400);
    ctx.supabase.fallarCreacion = null;
    expect(
      await ctx.repo(Cliente).findOneBy({ correo: 'otro.cliente@gmail.com' }),
    ).toBeNull();
  });

  it('HIL-01d - Datos no válidos: 400 con los tres mensajes y Auth no se llama', async () => {
    const llamadas = ctx.supabase.admin.createUser.mock.calls.length;
    const r = await request(http)
      .post('/api/auth/registro')
      .send({
        nombre: 'Camilo',
        correo: 'camilogmail.com',
        contrasena: 'Clave',
      })
      .expect(400);
    expect((r.body as Cuerpo).message).toHaveLength(3);
    expect(ctx.supabase.admin.createUser.mock.calls.length).toBe(llamadas);
  });
});

describe('HILO 2 — CU-13 Creación de usuario staff', () => {
  const datos = {
    nombre: 'CamiloRiosBaena',
    correo: 'cocina@remi.test',
    contrasena: 'Clave1234',
    rol: 'cocinero',
  };

  it('HIL-02a - El administrador crea un cocinero: 201 y fila con rol cocinero y estado activo', async () => {
    await request(http)
      .post('/api/auth/staff')
      .set(admin)
      .send(datos)
      .expect(201);
    expect(
      await ctx.repo(UserStaff).findOneBy({ correo: datos.correo }),
    ).toMatchObject({ rol: 'cocinero', estado: 'activo' });
  });

  it('HIL-02b - Correo repetido: 400', async () => {
    await request(http)
      .post('/api/auth/staff')
      .set(admin)
      .send(datos)
      .expect(400);
  });

  it('HIL-02c - Sin token: 401', async () => {
    await request(http)
      .post('/api/auth/staff')
      .send({ ...datos, correo: 'x1@remi.test' })
      .expect(401);
  });

  it('HIL-02d - Un cliente autenticado intenta crear un administrador: 403', async () => {
    await request(http)
      .post('/api/auth/staff')
      .set(cliente)
      .send({ ...datos, correo: 'x2@remi.test', rol: 'admin' })
      .expect(403);
  });
});

describe('HILO 3 — CU-11 Creación de plato', () => {
  it('HIL-03a - El administrador crea un plato con IVA 5 %: 201 y el detalle trae la categoría', async () => {
    const r = await request(http)
      .post('/api/menu/platos')
      .set(admin)
      .send({
        nombre: 'Ajiaco Colombiano',
        precio: 15000,
        descripcion: '',
        tasaIva: 0.05,
        categoriaId,
      })
      .expect(201);
    const p = await ctx.repo(Plato).findOne({
      where: { id: (r.body as Cuerpo).id },
      relations: ['categoria'],
    });
    expect(p).toMatchObject({
      disponible: true,
      categoria: { nombre: 'Platos fuertes' },
    });
    expect(Number(p!.tasaIva)).toBe(0.05);
  });

  it('HIL-03b - IVA de 3 %: 400 con mensaje en español', async () => {
    const r = await request(http)
      .post('/api/menu/platos')
      .set(admin)
      .send({
        nombre: 'Bandeja Paisa',
        precio: 15000,
        tasaIva: 0.03,
        categoriaId,
      })
      .expect(400);
    expect((r.body as Cuerpo).message).toContain(
      'El IVA debe ser 0 %, 5 % o 19 %',
    );
  });

  it('HIL-03c - Categoría inexistente: 400', async () => {
    await request(http)
      .post('/api/menu/platos')
      .set(admin)
      .send({ nombre: 'Bandeja Paisa', precio: 15000, categoriaId: 999 })
      .expect(400);
  });

  it('HIL-03d - Sin token: 401', async () => {
    await request(http)
      .post('/api/menu/platos')
      .send({ nombre: 'Plato sin token', precio: 1000, categoriaId })
      .expect(401);
  });
});

describe('HILO 4 — CU-12 Creación de ingrediente', () => {
  it('HIL-04a - El administrador crea un ingrediente en Kg: 201 y aparece en el inventario', async () => {
    await request(http)
      .post('/api/menu/ingredientes')
      .set(admin)
      .send({
        nombre: 'Aguacate Hass',
        unidadCompra: 'Kg',
        gramosPorUnidad: 1000,
        stockUnidades: 10,
        stockMinimoPorciones: 5,
      })
      .expect(201);
    const lista = await request(http)
      .get('/api/menu/ingredientes')
      .set(admin)
      .expect(200);
    expect(lista.body as Cuerpo).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nombre: 'Aguacate Hass',
          unidadCompra: 'Kg',
        }),
      ]),
    );
  });

  it('HIL-04b - Unidad "kg" en minúscula y stock negativo: 400 y no se guarda', async () => {
    await request(http)
      .post('/api/menu/ingredientes')
      .set(admin)
      .send({
        nombre: 'Tomate chonto',
        unidadCompra: 'kg',
        gramosPorUnidad: 1000,
        stockUnidades: -1,
      })
      .expect(400);
    expect(
      await ctx.repo(Ingrediente).findOneBy({ nombre: 'Tomate chonto' }),
    ).toBeNull();
  });

  it('HIL-04c - Sin token: 401', async () => {
    await request(http)
      .post('/api/menu/ingredientes')
      .send({
        nombre: 'Ingrediente sin token',
        unidadCompra: 'Kg',
        gramosPorUnidad: 1000,
      })
      .expect(401);
  });
});

describe('HILO 5 — CU-14 Creación de mesa', () => {
  it('HIL-05a - El administrador crea la mesa 7: 201 y queda en estado libre', async () => {
    const r = await request(http)
      .post('/api/pedidos/mesas')
      .set(admin)
      .send({ numero: 7 })
      .expect(201);
    expect(r.body as Cuerpo).toMatchObject({ numero: 7, estado: 'libre' });
  });

  it('HIL-05b - Mesa repetida: 400 "La mesa 7 ya existe" y sigue habiendo una sola', async () => {
    const r = await request(http)
      .post('/api/pedidos/mesas')
      .set(admin)
      .send({ numero: 7 })
      .expect(400);
    expect((r.body as Cuerpo).message).toBe('La mesa 7 ya existe');
    expect(await ctx.repo(Mesa).countBy({ numero: 7 })).toBe(1);
  });

  it('HIL-05c - Número 0: 400', async () => {
    await request(http)
      .post('/api/pedidos/mesas')
      .set(admin)
      .send({ numero: 0 })
      .expect(400);
  });

  it('HIL-05d - Sin token: 401', async () => {
    await request(http)
      .post('/api/pedidos/mesas')
      .send({ numero: 8 })
      .expect(401);
  });
});
