import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { AuthModule } from '../auth/auth.module';
import { Pedido } from './entities/pedido.entity';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { Pago } from './entities/pago.entity';
import { HistorialEstado } from './entities/historial-estado.entity';
import { TokenQr } from './entities/token-qr.entity';
import { Plato } from '../menu/entities/plato.entity';
import { Mesa } from '../mesas/entities/mesa.entity';
import { Cliente } from '../auth/entities/cliente.entity';
import { UserStaff } from '../auth/entities/user-staff.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido, DetallePedido, Pago, HistorialEstado, TokenQr,
      Plato, Mesa, Cliente, UserStaff,
    ]),
    AuthModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
