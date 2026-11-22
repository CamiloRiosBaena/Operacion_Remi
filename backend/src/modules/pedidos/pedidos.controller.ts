import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CreateMesaDto } from './dto/create-mesa.dto';
import { EstadoPedido } from './entities/pedido.entity';
import { EstadoMesa } from '../mesas/entities/mesa.entity';
import { SoloRoles } from '../auth/roles.guard';
import { RolStaff } from '../auth/entities/user-staff.entity';
import {
  ParseIdPipe,
  ParseTokenQrPipe,
} from '../../common/pipes/parse-id.pipe';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // ─────────────────────────────────────────
  // PEDIDOS
  // ─────────────────────────────────────────

  @Get()
  @SoloRoles(RolStaff.ADMIN)
  findAll(@Query('estado') estado?: EstadoPedido) {
    return this.pedidosService.findAllPedidos(estado);
  }

  /** GET /api/pedidos/:id/tracking — datos públicos de seguimiento (sin auth) */
  @Get(':id/tracking')
  getTracking(@Param('id', ParseIdPipe) id: number) {
    return this.pedidosService.getTrackingPublico(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.pedidosService.findOnePedido(id);
  }

  @Post()
  createPedido(@Body() dto: CreatePedidoDto) {
    return this.pedidosService.createPedido(dto);
  }

  @Patch(':id/estado')
  @SoloRoles(RolStaff.ADMIN)
  cambiarEstado(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.pedidosService.cambiarEstado(id, dto);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIdPipe) id: number,
    @Body('staffId') staffId?: number,
  ) {
    return this.pedidosService.cancelarPedido(id, staffId);
  }

  @Patch(':id/casillero')
  @SoloRoles(RolStaff.ADMIN)
  asignarCasillero(
    @Param('id', ParseIdPipe) id: number,
    @Body('casillero') casillero: 'X' | 'Y' | null,
  ) {
    return this.pedidosService.asignarCasillero(id, casillero);
  }

  // ─────────────────────────────────────────
  // QR DE ENTREGA
  // ─────────────────────────────────────────

  /** GET /api/pedidos/:id/qr — genera o reutiliza el token QR del pedido */
  @Get(':id/qr')
  getQrToken(@Param('id', ParseIdPipe) id: number) {
    return this.pedidosService.getOrCreateQrToken(id);
  }

  /** GET /api/pedidos/verificar-qr/:token — info del pedido por token (sin modificar) */
  @Get('verificar-qr/:token')
  getPedidoPorToken(@Param('token', ParseTokenQrPipe) token: string) {
    return this.pedidosService.getPedidoPorToken(token);
  }

  /** PATCH /api/pedidos/verificar-qr/:token/confirmar — confirma entrega con QR */
  @Patch('verificar-qr/:token/confirmar')
  @SoloRoles(RolStaff.ADMIN, RolStaff.DOMICILIARIO)
  confirmarEntregaConQr(@Param('token', ParseTokenQrPipe) token: string) {
    return this.pedidosService.confirmarEntregaConQr(token);
  }

  // ─────────────────────────────────────────
  // MESAS
  // ─────────────────────────────────────────

  @Get('mesas/todas')
  findAllMesas() {
    return this.pedidosService.findAllMesas();
  }

  @Post('mesas')
  @SoloRoles(RolStaff.ADMIN)
  createMesa(@Body() dto: CreateMesaDto) {
    return this.pedidosService.createMesa(dto.numero);
  }

  @Patch('mesas/:id')
  @SoloRoles(RolStaff.ADMIN)
  updateMesa(
    @Param('id', ParseIdPipe) id: number,
    @Body() data: { numero?: number; estado?: EstadoMesa; qrUrl?: string },
  ) {
    return this.pedidosService.updateMesa(id, data);
  }

  @Delete('mesas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SoloRoles(RolStaff.ADMIN)
  deleteMesa(@Param('id', ParseIdPipe) id: number) {
    return this.pedidosService.deleteMesa(id);
  }
}
