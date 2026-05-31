import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { Pago } from '../pedidos/entities/pago.entity';
import { Plato } from '../menu/entities/plato.entity';
import { Promo } from '../menu/entities/promo.entity';
import { PedidosModule } from '../pedidos/pedidos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pago, Plato, Promo]),
    PedidosModule, // Para usar PedidosService.createPedido()
  ],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
