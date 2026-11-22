import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuService],
    })
      // Las dependencias (repositorios, Supabase, otros servicios) se simulan: aquí solo
      // se verifica que la clase se construye; la lógica se prueba en src/pruebas-taller.
      .useMocker(() => ({}))
      .compile();

    service = module.get<MenuService>(MenuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
