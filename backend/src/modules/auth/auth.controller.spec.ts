import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    })
      // Las dependencias (repositorios, Supabase, otros servicios) se simulan: aquí solo
      // se verifica que la clase se construye; la lógica se prueba en src/pruebas-taller.
      .useMocker(() => ({}))
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
