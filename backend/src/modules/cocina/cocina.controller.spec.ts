import { Test, TestingModule } from '@nestjs/testing';
import { CocinaController } from './cocina.controller';

describe('CocinaController', () => {
  let controller: CocinaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CocinaController],
    })
      // Las dependencias (repositorios, Supabase, otros servicios) se simulan: aquí solo
      // se verifica que la clase se construye; la lógica se prueba en src/pruebas-taller.
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CocinaController>(CocinaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
