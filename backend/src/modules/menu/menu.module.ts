import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { Categoria } from './entities/categoria.entity';
import { Plato } from './entities/plato.entity';
import { Ingrediente } from './entities/ingrediente.entity';
import { PlatoIngrediente } from './entities/plato-ingrediente.entity';
import { Extra } from './entities/extra.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Categoria, Plato, Ingrediente, PlatoIngrediente, Extra]),
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
