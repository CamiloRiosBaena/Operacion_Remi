import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pedido, EstadoPedido, TipoPedido } from './entities/pedido.entity';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { HistorialEstado } from './entities/historial-estado.entity';
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
    // Validaciones de tipo
    if (dto.tipo === TipoPedido.MESA && !dto.mesaId)
      throw new BadRequestException('Un pedido de mesa requiere mesaId');
    if (dto.tipo === TipoPedido.DOMICILIO && !dto.direccionEntrega)
      throw new BadRequestException('Un pedido a domicilio requiere direccionEntrega');

    // Resolver relaciones opcionales
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

    // Calcular totales
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

    // Crear el pedido
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

    // Registrar historial de estado inicial
    await this.historialRepo.save(
      this.historialRepo.create({ pedido: saved, estado: EstadoPedido.PENDIENTE }),
    );

    // Ocupar la mesa si aplica
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

    // No permitir retroceder estados
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

    // Resolver staff opcional para auditoría
    let userStaff: UserStaff | null = null;
    if (dto.staffId) {
      userStaff = await this.staffRepo.findOneBy({ id: dto.staffId });
    }

    pedido.estado = dto.estado;
    const saved = await this.pedidoRepo.save(pedido);

    // Auditoría
    await this.historialRepo.save(
      this.historialRepo.create({ pedido: saved, estado: dto.estado, userStaff }),
    );

    // Liberar mesa cuando se entrega o cancela
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
  // CANCELAR
  // ─────────────────────────────────────────

  async cancelarPedido(id: number, staffId?: number): Promise<Pedido> {
    return this.cambiarEstado(id, {
      estado: EstadoPedido.CANCELADO,
      staffId,
    });
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
}
