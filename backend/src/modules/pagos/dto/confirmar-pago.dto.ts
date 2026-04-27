import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmarPagoDto {
  /** ID del pago retornado por Mercado Pago en el redirect (?payment_id=...) */
  @IsString() @IsNotEmpty()
  mpPaymentId: string;
}
