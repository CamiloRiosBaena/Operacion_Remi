import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { Categoria } from './entities/categoria.entity';
import { Plato } from './entities/plato.entity';
import { Ingrediente } from './entities/ingrediente.entity';
import { PlatoIngrediente } from './entities/plato-ingrediente.entity';
import { Extra } from './entities/extra.entity';
import { DetallePedido } from '../pedidos/entities/detalle-pedido.entity';
import { Promo } from './entities/promo.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Categoria, Plato, Ingrediente, PlatoIngrediente, Extra, DetallePedido, Promo]),
    AuthModule,
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
