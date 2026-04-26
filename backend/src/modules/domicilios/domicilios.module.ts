import { Module } from '@nestjs/common';
import { DomiciliosController } from './domicilios.controller';
import { DomiciliosService } from './domicilios.service';
import { PedidosModule } from '../pedidos/pedidos.module';

@Module({
  imports: [PedidosModule],
  controllers: [DomiciliosController],
  providers: [DomiciliosService],
})
export class DomiciliosModule {}