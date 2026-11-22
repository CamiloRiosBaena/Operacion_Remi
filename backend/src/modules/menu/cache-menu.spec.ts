import { Repository } from 'typeorm';
import { CacheMenu } from './cache-menu';
import { MenuService } from './menu.service';
import { Categoria } from './entities/categoria.entity';
import { Plato } from './entities/plato.entity';

describe('CacheMenu', () => {
  let reloj: number;
  const cache = () => new CacheMenu(60_000, () => reloj);

  beforeEach(() => {
    reloj = 0;
  });

  it('consulta la base una sola vez mientras la entrada está vigente', async () => {
    const c = cache();
    const cargar = jest.fn().mockResolvedValue(['menú']);
    await c.obtener('publico', cargar);
    await c.obtener('publico', cargar);
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('comparte una sola consulta entre peticiones simultáneas', async () => {
    const c = cache();
    const cargar = jest.fn().mockResolvedValue(['menú']);
    await Promise.all([1, 2, 3].map(() => c.obtener('publico', cargar)));
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar cuando vence la entrada', async () => {
    const c = cache();
    const cargar = jest.fn().mockResolvedValue(['menú']);
    await c.obtener('publico', cargar);
    reloj = 60_000;
    await c.obtener('publico', cargar);
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('vuelve a consultar después de invalidar', async () => {
    const c = cache();
    const cargar = jest.fn().mockResolvedValue(['menú']);
    await c.obtener('publico', cargar);
    c.invalidar();
    await c.obtener('publico', cargar);
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('no guarda una consulta que falló', async () => {
    const c = cache();
    const cargar = jest
      .fn()
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValue(['menú']);
    await expect(c.obtener('publico', cargar)).rejects.toThrow('sin conexión');
    await expect(c.obtener('publico', cargar)).resolves.toEqual(['menú']);
    expect(cargar).toHaveBeenCalledTimes(2);
  });
});

describe('MenuService con caché del menú', () => {
  function servicio() {
    const plato = { id: 1, disponible: true } as Plato;
    const buscarCategorias = jest.fn().mockResolvedValue([{ id: 1 }]);
    const buscarPlatos = jest.fn().mockResolvedValue([plato]);
    const buscarPlato = jest.fn().mockResolvedValue(plato);
    const categoriaRepo = {
      find: buscarCategorias,
    } as unknown as Repository<Categoria>;
    const platoRepo = {
      find: buscarPlatos,
      findOneBy: buscarPlato,
      save: jest.fn().mockImplementation((p: Plato) => Promise.resolve(p)),
    } as unknown as Repository<Plato>;
    const sinUso = {} as never;
    const menu = new MenuService(
      categoriaRepo,
      platoRepo,
      sinUso,
      sinUso,
      sinUso,
      sinUso,
      sinUso,
    );
    return { menu, buscarCategorias, buscarPlatos, buscarPlato };
  }

  it('sirve el menú público desde la caché', async () => {
    const { menu, buscarCategorias } = servicio();
    await menu.getMenuPublico();
    await menu.getMenuPublico();
    expect(buscarCategorias).toHaveBeenCalledTimes(1);
  });

  it('cambiar la disponibilidad de un plato invalida la caché', async () => {
    const { menu, buscarPlatos } = servicio();
    await menu.findAllPlatos();
    await menu.toggleDisponible(1);
    await menu.findAllPlatos();
    expect(buscarPlatos).toHaveBeenCalledTimes(2);
  });

  it('invalida la caché aunque la escritura falle', async () => {
    const { menu, buscarPlatos, buscarPlato } = servicio();
    await menu.findAllPlatos();
    buscarPlato.mockResolvedValueOnce(null);
    await expect(menu.toggleDisponible(99)).rejects.toThrow('no encontrado');
    await menu.findAllPlatos();
    expect(buscarPlatos).toHaveBeenCalledTimes(2);
  });
});
