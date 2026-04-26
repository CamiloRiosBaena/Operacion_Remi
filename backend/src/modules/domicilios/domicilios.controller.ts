import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { DomiciliosService } from './domicilios.service.js';

@Controller('domicilios')
export class DomiciliosController {
  constructor(private readonly domiciliosService: DomiciliosService) {}

  /** GET /api/domicilios/pedidos — pedidos en_camino del domiciliario */
  @Get('pedidos')
  getPedidos() {
    return this.domiciliosService.getPedidosActivos();
  }

  /** PATCH /api/domicilios/pedidos/:id/entregado — confirma entrega */
  @Patch('pedidos/:id/entregado')
  marcarEntregado(@Param('id', ParseIntPipe) id: number) {
    return this.domiciliosService.marcarEntregado(id);
  }
}