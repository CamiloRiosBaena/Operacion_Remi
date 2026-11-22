import { Controller, Get, Param, Patch } from '@nestjs/common';
import { DomiciliosService } from './domicilios.service.js';
import { SoloRoles } from '../auth/roles.guard';
import { RolStaff } from '../auth/entities/user-staff.entity';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';

@Controller('domicilios')
export class DomiciliosController {
  constructor(private readonly domiciliosService: DomiciliosService) {}

  /** GET /api/domicilios/pedidos — pedidos en_camino del domiciliario */
  @Get('pedidos')
  @SoloRoles(RolStaff.DOMICILIARIO, RolStaff.ADMIN)
  getPedidos() {
    return this.domiciliosService.getPedidosActivos();
  }

  /** PATCH /api/domicilios/pedidos/:id/entregado — confirma entrega */
  @Patch('pedidos/:id/entregado')
  @SoloRoles(RolStaff.DOMICILIARIO, RolStaff.ADMIN)
  marcarEntregado(@Param('id', ParseIdPipe) id: number) {
    return this.domiciliosService.marcarEntregado(id);
  }
}
