import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CocinaController } from './cocina.controller';
import { CocinaService } from './cocina.service';
import { PedidosModule } from '../pedidos/pedidos.module';
import { UserStaff } from '../auth/entities/user-staff.entity';

@Module({
  imports: [
    PedidosModule,
    TypeOrmModule.forFeature([UserStaff]),
  ],
  controllers: [CocinaController],
  providers: [CocinaService],
})
export class CocinaModule {}