import { Test, TestingModule } from '@nestjs/testing';
import { CocinaService } from './cocina.service';

describe('CocinaService', () => {
  let service: CocinaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CocinaService],
    }).compile();

    service = module.get<CocinaService>(CocinaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
