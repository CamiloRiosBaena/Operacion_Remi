import { Module } from '@nestjs/common';
import { DomiciliosController } from './domicilios.controller';
import { DomiciliosService } from './domicilios.service';
import { PedidosModule } from '../pedidos/pedidos.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PedidosModule, AuthModule],
  controllers: [DomiciliosController],
  providers: [DomiciliosService],
})
export class DomiciliosModule {}