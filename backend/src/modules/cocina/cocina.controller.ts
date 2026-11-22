import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CocinaService } from './cocina.service';
import { SoloRoles } from '../auth/roles.guard';
import { RolStaff } from '../auth/entities/user-staff.entity';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';

@Controller('cocina')
export class CocinaController {
  constructor(private readonly cocinaService: CocinaService) {}

  // ── KDS ──────────────────────────────────────────────────────────────────

  /** GET /api/cocina/pedidos — pendientes y en cocina, ordenados por llegada */
  @Get('pedidos')
  @SoloRoles(RolStaff.COCINERO, RolStaff.ADMIN)
  getPedidos() {
    return this.cocinaService.getPedidosActivos();
  }

  /** PATCH /api/cocina/pedidos/:id/en-cocina */
  @Patch('pedidos/:id/en-cocina')
  @SoloRoles(RolStaff.COCINERO, RolStaff.ADMIN)
  marcarEnCocina(@Param('id', ParseIdPipe) id: number) {
    return this.cocinaService.marcarEnCocina(id);
  }

  /** PATCH /api/cocina/pedidos/:id/listo */
  @Patch('pedidos/:id/listo')
  @SoloRoles(RolStaff.COCINERO, RolStaff.ADMIN)
  marcarListo(@Param('id', ParseIdPipe) id: number) {
    return this.cocinaService.marcarListo(id);
  }

  // ── Despacho ─────────────────────────────────────────────────────────────

  /** GET /api/cocina/despacho — domicilios listos esperando ser despachados */
  @Get('despacho')
  @SoloRoles(RolStaff.COCINERO, RolStaff.ADMIN)
  getPedidosDespacho() {
    return this.cocinaService.getPedidosDespacho();
  }

  /** POST /api/cocina/despacho — asigna pedidos a un domiciliario y los pone en_camino */
  @Post('despacho')
  @SoloRoles(RolStaff.COCINERO, RolStaff.ADMIN)
  despacharRuta(@Body() body: { pedidoIds: number[]; domiciliarioId: number }) {
    return this.cocinaService.despacharRuta(
      body.pedidoIds,
      body.domiciliarioId,
    );
  }

  /** GET /api/cocina/domiciliarios — domiciliarios activos disponibles */
  @Get('domiciliarios')
  @SoloRoles(RolStaff.COCINERO, RolStaff.ADMIN)
  getDomiciliarios() {
    return this.cocinaService.getDomiciliarios();
  }
}
