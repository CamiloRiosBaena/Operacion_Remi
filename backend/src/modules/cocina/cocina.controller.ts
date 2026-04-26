import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CocinaService } from './cocina.service';

@Controller('cocina')
export class CocinaController {
  constructor(private readonly cocinaService: CocinaService) {}

  // ── KDS ──────────────────────────────────────────────────────────────────

  /** GET /api/cocina/pedidos — pendientes y en cocina, ordenados por llegada */
  @Get('pedidos')
  getPedidos() {
    return this.cocinaService.getPedidosActivos();
  }

  /** PATCH /api/cocina/pedidos/:id/en-cocina */
  @Patch('pedidos/:id/en-cocina')
  marcarEnCocina(@Param('id', ParseIntPipe) id: number) {
    return this.cocinaService.marcarEnCocina(id);
  }

  /** PATCH /api/cocina/pedidos/:id/listo */
  @Patch('pedidos/:id/listo')
  marcarListo(@Param('id', ParseIntPipe) id: number) {
    return this.cocinaService.marcarListo(id);
  }

  // ── Despacho ─────────────────────────────────────────────────────────────

  /** GET /api/cocina/despacho — domicilios listos esperando ser despachados */
  @Get('despacho')
  getPedidosDespacho() {
    return this.cocinaService.getPedidosDespacho();
  }

  /** POST /api/cocina/despacho — asigna pedidos a un domiciliario y los pone en_camino */
  @Post('despacho')
  despacharRuta(@Body() body: { pedidoIds: number[]; domiciliarioId: number }) {
    return this.cocinaService.despacharRuta(body.pedidoIds, body.domiciliarioId);
  }

  /** GET /api/cocina/domiciliarios — domiciliarios activos disponibles */
  @Get('domiciliarios')
  getDomiciliarios() {
    return this.cocinaService.getDomiciliarios();
  }
}