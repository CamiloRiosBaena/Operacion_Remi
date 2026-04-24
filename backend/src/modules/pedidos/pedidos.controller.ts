import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // ─────────────────────────────────────────
  // PEDIDOS
  // ─────────────────────────────────────────

  /** GET /api/pedidos?estado=pendiente  (estado es opcional) */
  @Get()
  findAll(@Query('estado') estado?: EstadoPedido) {
    return this.pedidosService.findAllPedidos(estado);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.findOnePedido(id);
  }

  @Post()
  createPedido(@Body() dto: CreatePedidoDto) {
    return this.pedidosService.createPedido(dto);
  }

  /** PATCH /api/pedidos/:id/estado  — cambia estado con auditoría */
  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.pedidosService.cambiarEstado(id, dto);
  }

  /** PATCH /api/pedidos/:id/cancelar */
  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body('staffId') staffId?: number,
  ) {
    return this.pedidosService.cancelarPedido(id, staffId);
  }

  // ─────────────────────────────────────────
  // MESAS
  // ─────────────────────────────────────────

  @Get('mesas/todas')
  findAllMesas() {
    return this.pedidosService.findAllMesas();
  }

  @Post('mesas')
  createMesa(@Body() dto: CreateMesaDto) {
    return this.pedidosService.createMesa(dto.numero);
  }

  @Patch('mesas/:id')
  updateMesa(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { numero?: number; estado?: EstadoMesa; qrUrl?: string },
  ) {
    return this.pedidosService.updateMesa(id, data);
  }

  @Delete('mesas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMesa(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.deleteMesa(id);
  }
}
