import { Test, TestingModule } from '@nestjs/testing';
import { PedidosController } from './pedidos.controller';

describe('PedidosController', () => {
  let controller: PedidosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosController],
    })
      // Las dependencias (repositorios, Supabase, otros servicios) se simulan: aquí solo
      // se verifica que la clase se construye; la lógica se prueba en src/pruebas-taller.
      .useMocker(() => ({}))
      .compile();

    controller = module.get<PedidosController>(PedidosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
