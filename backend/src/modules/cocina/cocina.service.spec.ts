import { Test, TestingModule } from '@nestjs/testing';
import { CocinaService } from './cocina.service';

describe('CocinaService', () => {
  let service: CocinaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CocinaService],
    })
      // Las dependencias (repositorios, Supabase, otros servicios) se simulan: aquí solo
      // se verifica que la clase se construye; la lógica se prueba en src/pruebas-taller.
      .useMocker(() => ({}))
      .compile();

    service = module.get<CocinaService>(CocinaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
