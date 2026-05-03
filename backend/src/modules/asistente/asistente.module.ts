import { Module } from '@nestjs/common';
import { AsistenteController } from './asistente.controller';
import { AsistenteService } from './asistente.service';
import { MenuModule } from '../menu/menu.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MenuModule, AuthModule],
  controllers: [AsistenteController],
  providers: [AsistenteService],
})
export class AsistenteModule {}
