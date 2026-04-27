import { Body, Controller, Post } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { GenerarPagoDto } from './dto/generar-pago.dto';
import { ConfirmarPagoDto } from './dto/confirmar-pago.dto';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  /**
   * POST /api/pagos/generar
   * Crea una preferencia en Mercado Pago y devuelve la URL de checkout.
   * Público — no requiere auth.
   */
  @Post('generar')
  generar(@Body() dto: GenerarPagoDto) {
    return this.pagosService.generarPago(dto);
  }

  /**
   * POST /api/pagos/confirmar
   * Llamado por el frontend tras el redirect de Mercado Pago.
   * Verifica el pago con la API de MP y, si fue aprobado, crea el pedido.
   */
  @Post('confirmar')
  confirmar(@Body() dto: ConfirmarPagoDto) {
    return this.pagosService.confirmarPago(dto.mpPaymentId);
  }

  /**
   * POST /api/pagos/efectivo
   * Crea el pedido directamente con pago en efectivo (sin Mercado Pago).
   */
  @Post('efectivo')
  efectivo(@Body() dto: GenerarPagoDto) {
    return this.pagosService.pagarEfectivo(dto);
  }
}
