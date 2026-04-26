import { Injectable } from '@nestjs/common';
import { PedidosService } from '../pedidos/pedidos.service';
import { EstadoPedido, TipoPedido } from '../pedidos/entities/pedido.entity';

@Injectable()
export class DomiciliosService {
  constructor(private readonly pedidosService: PedidosService) {}

  async getPedidosActivos() {
    const todos = await this.pedidosService.findAllPedidos(EstadoPedido.EN_CAMINO);
    return todos
      .filter((p) => p.tipo === TipoPedido.DOMICILIO)
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
  }

  marcarEntregado(id: number) {
    return this.pedidosService.cambiarEstado(id, { estado: EstadoPedido.ENTREGADO });
  }
}