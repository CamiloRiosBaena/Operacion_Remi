import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PedidosService } from '../pedidos/pedidos.service';
import { EstadoPedido } from '../pedidos/entities/pedido.entity';
import { UserStaff, RolStaff, EstadoStaff } from '../auth/entities/user-staff.entity';

@Injectable()
export class CocinaService {
  constructor(
    private readonly pedidosService: PedidosService,
    @InjectRepository(UserStaff)
    private readonly staffRepo: Repository<UserStaff>,
  ) {}

  // ── KDS ────────────────────────────────────────────────────────────────────

  async getPedidosActivos() {
    const [pendientes, enCocina] = await Promise.all([
      this.pedidosService.findAllPedidos(EstadoPedido.PENDIENTE),
      this.pedidosService.findAllPedidos(EstadoPedido.EN_COCINA),
    ]);
    return [...pendientes, ...enCocina].sort(
      (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
    );
  }

  marcarEnCocina(id: number) {
    return this.pedidosService.cambiarEstado(id, { estado: EstadoPedido.EN_COCINA });
  }

  marcarListo(id: number) {
    return this.pedidosService.cambiarEstado(id, { estado: EstadoPedido.LISTO });
  }

  // ── Despacho ───────────────────────────────────────────────────────────────

  getPedidosDespacho() {
    return this.pedidosService.findPedidosListoDomicilio();
  }

  despacharRuta(pedidoIds: number[], domiciliarioId: number) {
    return this.pedidosService.despacharRuta(pedidoIds, domiciliarioId);
  }

  // ── Domiciliarios disponibles ──────────────────────────────────────────────

  getDomiciliarios() {
    return this.staffRepo.find({
      where: { rol: RolStaff.DOMICILIARIO, estado: EstadoStaff.ACTIVO },
      order: { nombre: 'ASC' },
    });
  }
}