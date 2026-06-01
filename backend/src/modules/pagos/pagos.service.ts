import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Pago, EstadoPago, MetodoPago } from '../pedidos/entities/pago.entity';
import { Plato } from '../menu/entities/plato.entity';
import { Promo } from '../menu/entities/promo.entity';
import { PedidosService } from '../pedidos/pedidos.service';

import { GenerarPagoDto } from './dto/generar-pago.dto';
import { TipoPedido } from '../pedidos/entities/pedido.entity';

// ── Tipos de respuesta ────────────────────────────────────────────────────────

export interface GenerarPagoResponse {
  pagoId: number;
  referencia: string;
  checkoutUrl: string; // URL de Mercado Pago para redirigir al usuario
}

export interface ConfirmarPagoResponse {
  pedidoId: number;
  estado: string;
  total: number;
  tipo: TipoPedido;
  referencia: string;
}

// ── Mapeo de métodos de pago MP → nuestro enum ───────────────────────────────

function mapMetodo(mpMethod?: string): MetodoPago | null {
  switch (mpMethod?.toLowerCase()) {
    case 'credit_card':
    case 'debit_card':   return MetodoPago.TARJETA;
    case 'pse':          return MetodoPago.PSE;
    case 'account_money':
    case 'mp_wallet':    return MetodoPago.NEQUI; // billetera MP
    default:             return null;
  }
}

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
  private readonly accessToken: string;
  private readonly appUrl: string;
  private readonly mpApiBase = 'https://api.mercadopago.com';

  constructor(
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    @InjectRepository(Plato)
    private readonly platoRepo: Repository<Plato>,
    @InjectRepository(Promo)
    private readonly promoRepo: Repository<Promo>,
    private readonly pedidosService: PedidosService,
    private readonly config: ConfigService,
  ) {
    this.accessToken = config.get<string>('MP_ACCESS_TOKEN', '');
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:5173');
  }

  // ── GENERAR PAGO ─────────────────────────────────────────────────────────

  async generarPago(dto: GenerarPagoDto): Promise<GenerarPagoResponse> {
    if (dto.tipo === TipoPedido.MESA && !dto.mesaId)
      throw new BadRequestException('Un pedido de mesa requiere mesaId');
    if (dto.tipo === TipoPedido.DOMICILIO && !dto.direccionEntrega)
      throw new BadRequestException('Un pedido a domicilio requiere direccionEntrega');

    // Calcular total desde precios reales (sin confiar en el frontend)
    const promos: Promo[] = dto.promoIds?.length
      ? await this.promoRepo.findBy({ id: In(dto.promoIds), activo: true })
      : [];

    let totalSinIva = 0;
    let ivaTotal = 0;

    for (const det of dto.detalles) {
      const plato = await this.platoRepo.findOne({
        where: { id: det.platoId },
        relations: ['categoria'],
      });
      if (!plato) throw new NotFoundException(`Plato ${det.platoId} no encontrado`);
      if (!plato.disponible)
        throw new BadRequestException(`El plato "${plato.nombre}" no está disponible`);

      const subtotalBruto = Number(plato.precio) * det.cantidad;

      const promo = promos.find((p) =>
        (p.ctaAccion === 'plato'     && Number(p.ctaValor) === det.platoId) ||
        (p.ctaAccion === 'categoria' && p.ctaValor === (plato.categoria as any)?.nombre),
      );

      let descuento = 0;
      if (promo?.tipoDescuento) {
        const val = Number(promo.valorDescuento ?? 0);
        if (promo.tipoDescuento === 'porcentaje') {
          descuento = subtotalBruto * (val / 100);
        } else if (promo.tipoDescuento === '2x1') {
          descuento = Number(plato.precio) * Math.floor(det.cantidad / 2);
        } else if (promo.tipoDescuento === 'monto_fijo') {
          descuento = Math.min(val, subtotalBruto);
        }
        descuento = Math.round(descuento * 100) / 100;
      }

      const subtotal = subtotalBruto - descuento;
      totalSinIva += subtotal;
      ivaTotal += subtotal * Number(plato.tasaIva);
    }

    const total = Math.round(totalSinIva + ivaTotal); // COP entero (MP no usa centavos)

    // Referencia única
    const referencia = `REMI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Crear preferencia en Mercado Pago
    const preference = {
      items: [
        {
          id: referencia,
          title: 'Pedido Operación Remi',
          quantity: 1,
          unit_price: total,
          currency_id: 'COP',
        },
      ],
      external_reference: referencia,
      back_urls: {
        success: `${this.appUrl}/pago-resultado`,
        failure: `${this.appUrl}/pago-resultado`,
        pending: `${this.appUrl}/pago-resultado`,
      },
      //auto_return: 'approved',
    };

    const mpRes = await fetch(`${this.mpApiBase}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.json().catch(() => ({}));
      throw new BadRequestException(
        `Error al crear preferencia en Mercado Pago: ${JSON.stringify(err)}`,
      );
    }

    const mpData = await mpRes.json() as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    // En modo prueba usar sandbox_init_point; en producción init_point
    const checkoutUrl = mpData.sandbox_init_point ?? mpData.init_point;

    // Guardar pago pendiente con datos del carrito
    const pago = await this.pagoRepo.save(
      this.pagoRepo.create({
        monto: total,
        estado: EstadoPago.PENDIENTE,
        referencia,
        datosPedido: JSON.stringify(dto),
        pedido: null,
      }),
    );

    this.logger.log(`Preferencia MP creada: ${mpData.id} → Pago #${pago.id}`);

    return { pagoId: pago.id, referencia, checkoutUrl };
  }

  // ── CONFIRMAR PAGO ───────────────────────────────────────────────────────

  async confirmarPago(mpPaymentId: string): Promise<ConfirmarPagoResponse> {
    // 1. Verificar pago con Mercado Pago
    const payment = await this.verificarConMP(mpPaymentId);

    if (payment.status !== 'approved') {
      throw new BadRequestException(
        `El pago no fue aprobado. Estado: ${payment.status}`,
      );
    }

    // 2. Buscar nuestro pago por referencia externa
    const pago = await this.pagoRepo.findOne({
      where: { referencia: payment.external_reference },
      relations: ['pedido'],
    });
    if (!pago) throw new NotFoundException('Registro de pago no encontrado');

    // 3. Idempotencia: si ya fue procesado, retornar el pedido existente
    if (pago.estado === EstadoPago.APROBADO && pago.pedido) {
      return {
        pedidoId: pago.pedido.id,
        estado: pago.pedido.estado,
        total: Number(pago.pedido.total),
        tipo: pago.pedido.tipo,
        referencia: pago.referencia!,
      };
    }

    // 4. Crear el pedido a partir de los datos guardados
    const datosCarrito = JSON.parse(pago.datosPedido!) as GenerarPagoDto;
    const pedido = await this.pedidosService.createPedido({
      tipo: datosCarrito.tipo,
      clienteId: datosCarrito.clienteId,
      mesaId: datosCarrito.mesaId,
      direccionEntrega: datosCarrito.direccionEntrega,
      tokenSesion: datosCarrito.tokenSesion,
      detalles: datosCarrito.detalles,
      promoIds: datosCarrito.promoIds,
    });

    // 5. Actualizar pago
    pago.estado = EstadoPago.APROBADO;
    pago.metodo = mapMetodo(payment.payment_type_id);
    pago.gatewayTransaccionId = mpPaymentId; // reutilizamos el campo para el ID de MP
    pago.pedido = pedido;
    await this.pagoRepo.save(pago);

    this.logger.log(`Pago MP ${mpPaymentId} aprobado → Pedido #${pedido.id} creado`);

    return {
      pedidoId: pedido.id,
      estado: pedido.estado,
      total: Number(pedido.total),
      tipo: pedido.tipo,
      referencia: pago.referencia!,
    };
  }

    // ── PAGAR EN EFECTIVO ────────────────────────────────────────────────────

  async pagarEfectivo(dto: GenerarPagoDto): Promise<ConfirmarPagoResponse> {
    if (dto.tipo === TipoPedido.MESA && !dto.mesaId)
      throw new BadRequestException('Un pedido de mesa requiere mesaId');
    if (dto.tipo === TipoPedido.DOMICILIO && !dto.direccionEntrega)
      throw new BadRequestException('Un pedido a domicilio requiere direccionEntrega');

    const promosEf: Promo[] = dto.promoIds?.length
      ? await this.promoRepo.findBy({ id: In(dto.promoIds), activo: true })
      : [];

    let totalSinIva = 0;
    let ivaTotal = 0;

    for (const det of dto.detalles) {
      const plato = await this.platoRepo.findOne({
        where: { id: det.platoId },
        relations: ['categoria'],
      });
      if (!plato) throw new NotFoundException(`Plato ${det.platoId} no encontrado`);
      if (!plato.disponible)
        throw new BadRequestException(`El plato "${plato.nombre}" no está disponible`);

      const subtotalBruto = Number(plato.precio) * det.cantidad;

      const promo = promosEf.find((p) =>
        (p.ctaAccion === 'plato'     && Number(p.ctaValor) === det.platoId) ||
        (p.ctaAccion === 'categoria' && p.ctaValor === (plato.categoria as any)?.nombre),
      );

      let descuento = 0;
      if (promo?.tipoDescuento) {
        const val = Number(promo.valorDescuento ?? 0);
        if (promo.tipoDescuento === 'porcentaje') {
          descuento = subtotalBruto * (val / 100);
        } else if (promo.tipoDescuento === '2x1') {
          descuento = Number(plato.precio) * Math.floor(det.cantidad / 2);
        } else if (promo.tipoDescuento === 'monto_fijo') {
          descuento = Math.min(val, subtotalBruto);
        }
        descuento = Math.round(descuento * 100) / 100;
      }

      const subtotal = subtotalBruto - descuento;
      totalSinIva += subtotal;
      ivaTotal += subtotal * Number(plato.tasaIva);
    }

    const total = Math.round(totalSinIva + ivaTotal);
    const referencia = `REMI-EF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const pedido = await this.pedidosService.createPedido({
      tipo: dto.tipo,
      clienteId: dto.clienteId,
      mesaId: dto.mesaId,
      direccionEntrega: dto.direccionEntrega,
      tokenSesion: dto.tokenSesion,
      detalles: dto.detalles,
      promoIds: dto.promoIds,
    });

    await this.pagoRepo.save(
      this.pagoRepo.create({
        monto: total,
        estado: EstadoPago.PENDIENTE,
        metodo: MetodoPago.EFECTIVO,
        referencia,
        datosPedido: JSON.stringify(dto),
        pedido,
      }),
    );

    this.logger.log(`Pago en efectivo → Pedido #${pedido.id} creado`);

    return {
      pedidoId: pedido.id,
      estado: pedido.estado,
      total: Number(pedido.total),
      tipo: pedido.tipo,
      referencia,
    };
  }

  // ── VERIFICAR CON MERCADO PAGO API ──────────────────────────────────────

  private async verificarConMP(paymentId: string) {
    const res = await fetch(`${this.mpApiBase}/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      throw new BadRequestException(
        `No se pudo verificar el pago con Mercado Pago (${res.status})`,
      );
    }

    return res.json() as Promise<{
      id: number;
      status: 'approved' | 'rejected' | 'pending' | 'in_process' | 'cancelled';
      status_detail: string;
      external_reference: string;
      transaction_amount: number;
      payment_type_id: string;
      payment_method_id: string;
    }>;
  }
}
