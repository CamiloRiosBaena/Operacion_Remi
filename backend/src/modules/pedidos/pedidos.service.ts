import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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
import { NotificacionesService } from '../auth/notificaciones.service';

import { CreatePedidoDto } from './dto/create-pedido.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';

const MENSAJES_ESTADO: Record<EstadoPedido, { titulo: string; cuerpo: string }> = {
  [EstadoPedido.PENDIENTE]:  { titulo: '¡Pedido recibido!', cuerpo: 'Tu pedido está en espera de confirmación.' },
  [EstadoPedido.EN_COCINA]:  { titulo: '¡En cocina!', cuerpo: 'Los cocineros ya están preparando tu pedido 🍳' },
  [EstadoPedido.LISTO]:      { titulo: '¡Pedido listo!', cuerpo: 'Tu pedido está listo para recoger o entrega.' },
  [EstadoPedido.EN_CAMINO]:  { titulo: '¡En camino!', cuerpo: 'Tu domicilio está en camino 🛵' },
  [EstadoPedido.ENTREGADO]:  { titulo: '¡Entregado!', cuerpo: '¡Buen provecho! Gracias por tu pedido 🎉' },
  [EstadoPedido.CANCELADO]:  { titulo: 'Pedido cancelado', cuerpo: 'Tu pedido fue cancelado. Contáctanos si tienes dudas.' },
};

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
    private readonly notiService: NotificacionesService,
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
      tokenSesion: dto.tokenSesion ?? null,
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

    // Capturar casillero actual antes de cambiar estado (para procesar la cola al entregar)
    const casilleroAnterior = pedido.casillero;

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

    // Push notification: para pedidos locales que pasan a LISTO, el mensaje
    // lo envía asignarCasilleroAutomatico (incluye el número de casillero).
    const esListoLocal =
      dto.estado === EstadoPedido.LISTO &&
      (pedido.tipo === TipoPedido.MESA || pedido.tipo === TipoPedido.PARA_LLEVAR);

    if (pedido.tokenSesion && !esListoLocal) {
      const msg = MENSAJES_ESTADO[dto.estado];
      if (msg) {
        this.notiService
          .enviarPush(pedido.tokenSesion, msg.titulo, msg.cuerpo, `/menu`)
          .catch(() => {});
      }
    }

    // Auto-asignar casillero cuando un pedido local queda listo
    if (esListoLocal) {
      await this.asignarCasilleroAutomatico(saved);
    }

    // Al entregar o cancelar un pedido con casillero, liberar el casillero
    // y asignarlo al siguiente pedido en espera
    if (
      casilleroAnterior &&
      (dto.estado === EstadoPedido.ENTREGADO || dto.estado === EstadoPedido.CANCELADO)
    ) {
      await this.procesarColaEspera(casilleroAnterior);
    }

    try {
      return await this.findOnePedido(saved.id);
    } catch {
      return saved;
    }
  }

  // ─────────────────────────────────────────
  // TRACKING PÚBLICO
  // ─────────────────────────────────────────

  async getTrackingPublico(id: number) {
    const pedido = await this.pedidoRepo.findOne({
      where: { id },
      relations: ['detalles', 'detalles.plato', 'historial'],
      select: {
        id: true,
        estado: true,
        tipo: true,
        total: true,
        fechaHora: true,
        casillero: true,
      },
    });
    if (!pedido) throw new NotFoundException(`Pedido ${id} no encontrado`);

    return {
      id: pedido.id,
      estado: pedido.estado,
      tipo: pedido.tipo,
      total: pedido.total,
      fechaHora: pedido.fechaHora,
      casillero: pedido.casillero ?? null,
      items: pedido.detalles?.map((d) => ({
        nombre: d.plato?.nombre ?? 'Plato',
        cantidad: d.cantidad,
      })) ?? [],
      historial: pedido.historial?.map((h) => ({
        estado: h.estado,
        fechaHora: h.fechaHora,
      })) ?? [],
    };
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

    // Crear nuevo token con 4 h de vigencia
    const expiracion = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const saved = await this.tokenQrRepo.save(
      this.tokenQrRepo.create({ token: randomUUID(), expiracion, pedido }),
    );
    return { token: saved.token, expiracion: saved.expiracion };
  }

  async getPedidoPorToken(token: string): Promise<Pedido> {
    const tokenQr = await this.tokenQrRepo.findOne({
      where: { token },
      relations: ['pedido', 'pedido.cliente', 'pedido.mesa', 'pedido.detalles', 'pedido.detalles.plato'],
    });
    if (!tokenQr) throw new NotFoundException('QR no válido');
    if (tokenQr.expiracion < new Date()) throw new GoneException('El QR ha expirado');
    return tokenQr.pedido;
  }

  async asignarCasillero(pedidoId: number, casillero: 'X' | 'Y' | null): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['cliente', 'mesa', 'detalles', 'detalles.plato'],
    });
    if (!pedido) throw new NotFoundException(`Pedido ${pedidoId} no encontrado`);
    if (pedido.tipo !== TipoPedido.MESA && pedido.tipo !== TipoPedido.PARA_LLEVAR)
      throw new BadRequestException('Solo se pueden asignar casilleros a pedidos en local');
    pedido.casillero = casillero;
    return this.pedidoRepo.save(pedido);
  }

  // ─────────────────────────────────────────
  // LÓGICA DE CASILLEROS
  // ─────────────────────────────────────────

  /** Devuelve el primer casillero libre ('X' o 'Y'), o null si ambos están ocupados. */
  private async getLockerLibre(): Promise<'X' | 'Y' | null> {
    const [conX, conY] = await Promise.all([
      this.pedidoRepo.count({ where: { estado: EstadoPedido.LISTO, casillero: 'X' } }),
      this.pedidoRepo.count({ where: { estado: EstadoPedido.LISTO, casillero: 'Y' } }),
    ]);
    if (conX === 0) return 'X';
    if (conY === 0) return 'Y';
    return null;
  }

  /**
   * Intenta asignar un casillero libre al pedido.
   * Si no hay casillero libre, notifica al cliente que espere.
   * Si hay casillero libre, lo asigna y notifica con el número.
   */
  private async asignarCasilleroAutomatico(pedido: Pedido): Promise<void> {
    const locker = await this.getLockerLibre();

    if (locker) {
      pedido.casillero = locker;
      await this.pedidoRepo.save(pedido);

      if (pedido.tokenSesion) {
        this.notiService
          .enviarPush(
            pedido.tokenSesion,
            '¡Tu pedido está listo! 🔑',
            `Retíralo en el casillero ${locker}`,
            '/menu',
          )
          .catch(() => {});
      }
    } else {
      // Ambos casilleros ocupados — el pedido entra en cola
      if (pedido.tokenSesion) {
        this.notiService
          .enviarPush(
            pedido.tokenSesion,
            '¡Tu pedido está listo!',
            'Todos los casilleros están ocupados. Te avisamos en cuanto tengas uno disponible.',
            '/menu',
          )
          .catch(() => {});
      }
    }
  }

  /**
   * Cuando se libera un casillero, busca el pedido local más antiguo en espera
   * (listo + sin casillero) y se lo asigna.
   */
  private async procesarColaEspera(locker: 'X' | 'Y'): Promise<void> {
    const enEspera = await this.pedidoRepo.findOne({
      where: {
        estado: EstadoPedido.LISTO,
        tipo: In([TipoPedido.MESA, TipoPedido.PARA_LLEVAR]),
        casillero: IsNull() as any,
      },
      order: { fechaHora: 'ASC' },
    });

    if (!enEspera) return;

    enEspera.casillero = locker;
    await this.pedidoRepo.save(enEspera);

    if (enEspera.tokenSesion) {
      this.notiService
        .enviarPush(
          enEspera.tokenSesion,
          '¡Casillero asignado! 🔑',
          `Ya puedes retirar tu pedido en el casillero ${locker}`,
          '/menu',
        )
        .catch(() => {});
    }
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
