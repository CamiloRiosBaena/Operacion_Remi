import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Pedido, EstadoPedido, TipoPedido } from './entities/pedido.entity';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { HistorialEstado } from './entities/historial-estado.entity';
import { TokenQr } from './entities/token-qr.entity';
import { Plato } from '../menu/entities/plato.entity';
import { Mesa } from '../mesas/entities/mesa.entity';
import { EstadoMesa } from '../mesas/entities/mesa.entity';
import { Cliente } from '../auth/entities/cliente.entity';
import { UserStaff } from '../auth/entities/user-staff.entity';

import { CreatePedidoDto } from './dto/create-pedido.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(DetallePedido)
    private readonly detalleRepo: Repository<DetallePedido>,
    @InjectRepository(HistorialEstado)
    private readonly historialRepo: Repository<HistorialEstado>,
    @InjectRepository(TokenQr)
    private readonly tokenQrRepo: Repository<TokenQr>,
    @InjectRepository(Plato)
    private readonly platoRepo: Repository<Plato>,
    @InjectRepository(Mesa)
    private readonly mesaRepo: Repository<Mesa>,
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(UserStaff)
    private readonly staffRepo: Repository<UserStaff>,
  ) {}

  // ─────────────────────────────────────────
  // CREAR PEDIDO
  // ─────────────────────────────────────────

  async createPedido(dto: CreatePedidoDto): Promise<Pedido> {
    if (dto.tipo === TipoPedido.MESA && !dto.mesaId)
      throw new BadRequestException('Un pedido de mesa requiere mesaId');
    if (dto.tipo === TipoPedido.DOMICILIO && !dto.direccionEntrega)
      throw new BadRequestException('Un pedido a domicilio requiere direccionEntrega');

    let cliente: Cliente | null = null;
    if (dto.clienteId) {
      cliente = await this.clienteRepo.findOneBy({ id: dto.clienteId });
      if (!cliente) throw new NotFoundException(`Cliente ${dto.clienteId} no encontrado`);
    }

    let mesa: Mesa | null = null;
    if (dto.mesaId) {
      mesa = await this.mesaRepo.findOneBy({ id: dto.mesaId });
      if (!mesa) throw new NotFoundException(`Mesa ${dto.mesaId} no encontrada`);
    }

    let totalSinIva = 0;
    let ivaTotal = 0;
    const detallesEntidades: DetallePedido[] = [];

    for (const det of dto.detalles) {
      const plato = await this.platoRepo.findOneBy({ id: det.platoId });
      if (!plato) throw new NotFoundException(`Plato ${det.platoId} no encontrado`);
      if (!plato.disponible)
        throw new BadRequestException(`El plato "${plato.nombre}" no está disponible`);

      const subtotal = Number(plato.precio) * det.cantidad;
      const montoIva = subtotal * Number(plato.tasaIva);

      totalSinIva += subtotal;
      ivaTotal    += montoIva;

      detallesEntidades.push(
        this.detalleRepo.create({
          plato,
          cantidad: det.cantidad,
          personalizacion: det.personalizacion ?? null,
          subtotal,
          montoIva,
        }),
      );
    }

    const pedido = this.pedidoRepo.create({
      tipo: dto.tipo,
      estado: EstadoPedido.PENDIENTE,
      cliente,
      mesa,
      direccionEntrega: dto.direccionEntrega ?? null,
      totalSinIva,
      ivaTotal,
      total: totalSinIva + ivaTotal,
      detalles: detallesEntidades,
    });

    const saved = await this.pedidoRepo.save(pedido);

    await this.historialRepo.save(
      this.historialRepo.create({ pedido: saved, estado: EstadoPedido.PENDIENTE }),
    );

    if (mesa) {
      mesa.estado = EstadoMesa.OCUPADA;
      await this.mesaRepo.save(mesa);
    }

    return this.findOnePedido(saved.id);
  }

  // ─────────────────────────────────────────
  // LISTAR
  // ─────────────────────────────────────────

  findAllPedidos(estado?: EstadoPedido): Promise<Pedido[]> {
    const where = estado ? { estado } : {};
    return this.pedidoRepo.find({
      where,
      relations: ['cliente', 'mesa', 'detalles', 'detalles.plato'],
      order: { fechaHora: 'DESC' },
    });
  }

  async findOnePedido(id: number): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id },
      relations: [
        'cliente',
        'mesa',
        'detalles',
        'detalles.plato',
        'pagos',
        'historial',
        'historial.userStaff',
      ],
    });
    if (!pedido) throw new NotFoundException(`Pedido ${id} no encontrado`);
    return pedido;
  }

  // ─────────────────────────────────────────
  // CAMBIAR ESTADO
  // ─────────────────────────────────────────

  async cambiarEstado(id: number, dto: CambiarEstadoDto): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id },
      relations: ['mesa'],
    });
    if (!pedido) throw new NotFoundException(`Pedido ${id} no encontrado`);

    const orden: EstadoPedido[] = [
      EstadoPedido.PENDIENTE,
      EstadoPedido.EN_COCINA,
      EstadoPedido.LISTO,
      EstadoPedido.EN_CAMINO,
      EstadoPedido.ENTREGADO,
    ];
    const idxActual = orden.indexOf(pedido.estado);
    const idxNuevo  = orden.indexOf(dto.estado);

    if (idxNuevo !== -1 && idxActual !== -1 && idxNuevo < idxActual) {
      throw new BadRequestException(
        `No se puede retroceder el estado de "${pedido.estado}" a "${dto.estado}"`,
      );
    }

    let userStaff: UserStaff | null = null;
    if (dto.staffId) {
      userStaff = await this.staffRepo.findOneBy({ id: dto.staffId });
    }

    pedido.estado = dto.estado;
    const saved = await this.pedidoRepo.save(pedido);

    await this.historialRepo.save(
      this.historialRepo.create({ pedido: saved, estado: dto.estado, userStaff }),
    );

    if (
      pedido.mesa &&
      (dto.estado === EstadoPedido.ENTREGADO || dto.estado === EstadoPedido.CANCELADO)
    ) {
      pedido.mesa.estado = EstadoMesa.LIBRE;
      await this.mesaRepo.save(pedido.mesa);
    }

    return this.findOnePedido(saved.id);
  }

  // ─────────────────────────────────────────
  // DESPACHO (domicilios listos)
  // ─────────────────────────────────────────

  findPedidosListoDomicilio(): Promise<Pedido[]> {
    return this.pedidoRepo.find({
      where: { estado: EstadoPedido.LISTO, tipo: TipoPedido.DOMICILIO },
      relations: ['cliente', 'detalles', 'detalles.plato', 'historial'],
      order: { fechaHora: 'ASC' },
    });
  }

  async despacharRuta(pedidoIds: number[], staffId: number): Promise<Pedido[]> {
    return Promise.all(
      pedidoIds.map((id) => this.cambiarEstado(id, { estado: EstadoPedido.EN_CAMINO, staffId })),
    );
  }

  // ─────────────────────────────────────────
  // CANCELAR
  // ─────────────────────────────────────────

  async cancelarPedido(id: number, staffId?: number): Promise<Pedido> {
    return this.cambiarEstado(id, { estado: EstadoPedido.CANCELADO, staffId });
  }

  // ─────────────────────────────────────────
  // MESAS
  // ─────────────────────────────────────────

  findAllMesas(): Promise<Mesa[]> {
    return this.mesaRepo.find({ order: { numero: 'ASC' } });
  }

  async createMesa(numero: number): Promise<Mesa> {
    const existe = await this.mesaRepo.findOneBy({ numero });
    if (existe) throw new BadRequestException(`La mesa ${numero} ya existe`);
    return this.mesaRepo.save(this.mesaRepo.create({ numero }));
  }

  async updateMesa(id: number, data: Partial<{ numero: number; estado: EstadoMesa; qrUrl: string }>) {
    const mesa = await this.mesaRepo.findOneBy({ id });
    if (!mesa) throw new NotFoundException(`Mesa ${id} no encontrada`);
    Object.assign(mesa, data);
    return this.mesaRepo.save(mesa);
  }

  async deleteMesa(id: number): Promise<void> {
    const mesa = await this.mesaRepo.findOneBy({ id });
    if (!mesa) throw new NotFoundException(`Mesa ${id} no encontrada`);
    await this.mesaRepo.remove(mesa);
  }

  // ─────────────────────────────────────────
  // QR DE ENTREGA
  // ─────────────────────────────────────────

  async getOrCreateQrToken(pedidoId: number): Promise<{ token: string; expiracion: Date }> {
    const pedido = await this.pedidoRepo.findOneBy({ id: pedidoId });
    if (!pedido) throw new NotFoundException(`Pedido ${pedidoId} no encontrado`);

    // Reutilizar token vigente si existe
    const existing = await this.tokenQrRepo.findOne({
      where: { pedido: { id: pedidoId } },
      order: { expiracion: 'DESC' },
    });

    if (existing && existing.expiracion > new Date()) {
      return { token: existing.token, expiracion: existing.expiracion };
    }

    // Crear nuevo token con 24 h de vigencia
    const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const saved = await this.tokenQrRepo.save(
      this.tokenQrRepo.create({ token: randomUUID(), expiracion, pedido }),
    );
    return { token: saved.token, expiracion: saved.expiracion };
  }

  async getPedidoPorToken(token: string): Promise<Pedido> {
    const tokenQr = await this.tokenQrRepo.findOne({
      where: { token },
      relations: ['pedido', 'pedido.cliente', 'pedido.detalles', 'pedido.detalles.plato'],
    });
    if (!tokenQr) throw new NotFoundException('QR no válido');
    if (tokenQr.expiracion < new Date()) throw new GoneException('El QR ha expirado');
    return tokenQr.pedido;
  }

  async confirmarEntregaConQr(token: string): Promise<Pedido> {
    const tokenQr = await this.tokenQrRepo.findOne({
      where: { token },
      relations: ['pedido'],
    });
    if (!tokenQr) throw new NotFoundException('QR no válido');
    if (tokenQr.expiracion < new Date()) throw new GoneException('El QR ha expirado');

    const pedido = tokenQr.pedido;
    if (pedido.estado === EstadoPedido.ENTREGADO)
      throw new BadRequestException('El pedido ya fue marcado como entregado');

    await this.tokenQrRepo.remove(tokenQr);
    return this.cambiarEstado(pedido.id, { estado: EstadoPedido.ENTREGADO });
  }
}
