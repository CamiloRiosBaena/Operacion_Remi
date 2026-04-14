import { Test, TestingModule } from '@nestjs/testing';
import { CocinaController } from './cocina.controller';

describe('CocinaController', () => {
  let controller: CocinaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CocinaController],
    }).compile();

    controller = module.get<CocinaController>(CocinaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
