import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { usePromos } from '@/features/menu/context/PromosContext';
import { calcularDescuento } from '@/features/menu/types/promo.types';
import type { Promo } from '@/features/menu/types/promo.types';
import { PlatoImage } from '@/shared/components/PlatoImage';
import {
  fetchMesas,
  fetchQrTokenPublico,
  type TipoPedido,
  type Mesa,
} from '@/features/pedidos/services/pedidos.service';
import { generarPago, pagarEfectivo, type ConfirmarPagoResponse } from '@/features/pago/services/pagos.service';
import { initGuestSession, setActivePedido } from '@/shared/lib/guestSession';
import { usePushNotifications } from '@/shared/hooks/usePushNotifications';
import styles from './CartDrawer.module.css';

const API_URL = import.meta.env.VITE_API_URL as string;

interface Props {
  open: boolean;
  onClose: () => void;
  mesaQr?: number;
  onPedidoCreado?: () => void; // reservado para uso futuro
}

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

function itemTotal(precio: number, extras: { precio: number; cantidad: number }[], cantidad: number) {
  const extrasSum = extras.reduce((s, e) => s + e.precio * e.cantidad, 0);
  return (precio + extrasSum) * cantidad;
}

// ── Paso de checkout ──────────────────────────────────────────────────────────
type Step = 'carrito' | 'checkout' | 'pago' | 'confirmado';

export function CartDrawer({ open, onClose, mesaQr, onPedidoCreado }: Props) {
  const { items, count, total, removeItem, updateCantidad, clearCart } = useCarrito();
  const { user } = useAuth();
  const { promos } = usePromos();
  const { permission, requestPush, swReady } = usePushNotifications();

  // ── Cálculo de descuentos por promos activas ──────────────────────────────
  /** Para cada cartItemKey → promo aplicable (si tiene descuento configurado) */
  const promosPorItem = useMemo(() => {
    const map = new Map<string, Promo>();
    for (const item of items) {
      const promo = promos.find(
        (p) =>
          p.activo &&
          p.tipoDescuento &&
          ((p.ctaAccion === 'plato' && p.ctaValor === String(item.platoId)) ||
            (p.ctaAccion === 'categoria' && p.ctaValor === item.categoria)),
      );
      if (promo) map.set(item.cartItemKey, promo);
    }
    return map;
  }, [items, promos]);

  const descuentoPorItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const promo = promosPorItem.get(item.cartItemKey);
      if (promo) {
        map.set(item.cartItemKey, calcularDescuento(promo, item.precio, item.cantidad));
      }
    }
    return map;
  }, [items, promosPorItem]);

  const descuentoTotal = useMemo(
    () => [...descuentoPorItem.values()].reduce((s, v) => s + v, 0),
    [descuentoPorItem],
  );

  /** IDs únicos de promos aplicadas al carrito actual */
  const promoIdsAplicadas = useMemo(
    () => [...new Set([...promosPorItem.values()].map((p) => p.id))],
    [promosPorItem],
  );

  const totalConDescuento = total - descuentoTotal;

  const [step, setStep]               = useState<Step>('carrito');
  const [tipo, setTipo]               = useState<TipoPedido>(mesaQr ? 'mesa' : 'llevar');
  const [mesaId, setMesaId]           = useState<number | ''>(mesaQr ?? '');
  const [direccion, setDireccion]     = useState('');
  const [mesas, setMesas]             = useState<Mesa[]>([]);
  const [errorPedido, setErrorPedido]       = useState('');
  const [pushSolicitado, setPushSolicitado] = useState(false);

  // ── Estado del paso de pago ──
  const [cargandoPago, setCargandoPago]           = useState(false);
  const [cargandoEfectivo, setCargandoEfectivo]   = useState(false);
  const [errorPago, setErrorPago]                 = useState('');
  const [pedidoConfirmado, setPedidoConfirmado]   = useState<ConfirmarPagoResponse | null>(null);
  const [qrToken, setQrToken]                     = useState<string | null>(null);

  // ── Pasarela simulada de tarjeta ──
  const [showCardForm,      setShowCardForm     ] = useState(false);
  const [cardNum,           setCardNum          ] = useState('');
  const [cardName,          setCardName         ] = useState('');
  const [cardExpiry,        setCardExpiry       ] = useState('');
  const [cardCVV,           setCardCVV          ] = useState('');
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Cargar QR cuando el pedido queda confirmado (efectivo)
  useEffect(() => {
    if (pedidoConfirmado) {
      fetchQrTokenPublico(pedidoConfirmado.pedidoId)
        .then(({ token }) => setQrToken(token))
        .catch(console.error);
    } else {
      setQrToken(null);
    }
  }, [pedidoConfirmado]);

  // Si cambia mesaQr (navegación), sincronizar
  useEffect(() => {
    if (mesaQr) {
      setTipo('mesa');
      setMesaId(mesaQr);
    }
  }, [mesaQr]);

  // Cargar mesas cuando se abre el checkout en modo mesa
  useEffect(() => {
    if (step === 'checkout' && tipo === 'mesa' && mesas.length === 0) {
      fetchMesas().then(setMesas).catch(console.error);
    }
  }, [step, tipo, mesas.length]);

  // Reset al cerrar: vuelve al carrito si se cierra desde checkout o pago
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        if (step !== 'carrito') {
          setStep('carrito');
          setTipo(mesaQr ? 'mesa' : 'llevar');
          setMesaId(mesaQr ?? '');
          setDireccion('');
          setErrorPedido('');
          setErrorPago('');
          setCargandoPago(false);
          setCargandoEfectivo(false);
          setPedidoConfirmado(null);
          setShowCardForm(false);
          setCardNum(''); setCardName(''); setCardExpiry(''); setCardCVV('');
          setSimulatingPayment(false);
        }
      }, 300);
    }
  }, [open, step, mesaQr]);

  async function handleSolicitarPush() {
    setPushSolicitado(true);
    await requestPush();
  }

  // ── Ir al paso de pago: valida el checkout y avanza ──
  function handleIrAPago() {
    if (tipo === 'mesa' && !mesaId) { setErrorPedido('Selecciona una mesa'); return; }
    if (tipo === 'domicilio' && !direccion.trim()) { setErrorPedido('Ingresa la dirección de entrega'); return; }
    setErrorPedido('');
    setErrorPago('');
    setStep('pago');
  }

// ── Genera la sesión, llama al backend y redirige al checkout de Mercado Pago ──
async function handleLanzarPago() {
  setCargandoPago(true);
  setErrorPago('');
  try {
    const tokenSesion = await initGuestSession(API_URL).catch(() => null);

    const detalles = items.map((item) => ({
      platoId: item.platoId,
      cantidad: item.cantidad,
      personalizacion: (item.ingredientesRemovidos?.length || item.extras?.length || item.nota)
        ? JSON.stringify({ removidos: item.ingredientesRemovidos ?? [], extras: item.extras ?? [], nota: item.nota ?? '' })
        : undefined,
    }));

    const data = await generarPago({
      tipo,
      clienteId:        user ? Number(user.id) : undefined,
      mesaId:           tipo === 'mesa' && mesaId ? Number(mesaId) : undefined,
      direccionEntrega: tipo === 'domicilio' ? direccion : undefined,
      tokenSesion:      tokenSesion ?? undefined,
      detalles,
      promoIds:         promoIdsAplicadas.length ? promoIdsAplicadas : undefined,
    });

    window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
    onClose();
  } catch (err) {
    setErrorPago(err instanceof Error ? err.message : 'Error al preparar el pago');
  } finally {
    setCargandoPago(false);
  }
}

async function handlePagarEfectivo() {
  setCargandoEfectivo(true);
  setErrorPago('');
  try {
    const tokenSesion = await initGuestSession(API_URL).catch(() => null);

    const detalles = items.map((item) => ({
      platoId: item.platoId,
      cantidad: item.cantidad,
      personalizacion: (item.ingredientesRemovidos?.length || item.extras?.length || item.nota)
        ? JSON.stringify({ removidos: item.ingredientesRemovidos ?? [], extras: item.extras ?? [], nota: item.nota ?? '' })
        : undefined,
    }));

    const data = await pagarEfectivo({
      tipo,
      clienteId:        user ? Number(user.id) : undefined,
      mesaId:           tipo === 'mesa' && mesaId ? Number(mesaId) : undefined,
      direccionEntrega: tipo === 'domicilio' ? direccion : undefined,
      tokenSesion:      tokenSesion ?? undefined,
      detalles,
      promoIds:         promoIdsAplicadas.length ? promoIdsAplicadas : undefined,
    });

    clearCart();
    setActivePedido({ id: data.pedidoId, tipo: data.tipo, estado: data.estado, clienteId: user?.id });
    onPedidoCreado?.();
    setPedidoConfirmado(data);
    setStep('confirmado');
  } catch (err) {
    setErrorPago(err instanceof Error ? err.message : 'Error al registrar el pedido');
  } finally {
    setCargandoEfectivo(false);
  }
}

  // ── Helpers de la pasarela simulada ──
  function handleCardNumChange(e: { target: { value: string } }) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNum(raw.replace(/(.{4})/g, '$1 ').trim());
  }
  function handleExpiryChange(e: { target: { value: string } }) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw);
  }
  async function handlePagarSimulado(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSimulatingPayment(true);
    try {
      await new Promise<void>(r => setTimeout(r, 2400));
      await handlePagarEfectivo();
    } finally {
      setSimulatingPayment(false);
    }
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`${styles.panel} ${open ? styles.panelOpen : ''}`} aria-label="Carrito de compras">

        {/* ── PASO: CARRITO ── */}
        {step === 'carrito' && (
          <>
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <h2 className={styles.title}>Tu pedido</h2>
                {count > 0 && <span className={styles.countBadge}>{count}</span>}
              </div>
              <div className={styles.headerActions}>
                {items.length > 0 && (
                  <button className={styles.btnClear} onClick={clearCart}>Vaciar</button>
                )}
                <button className={styles.btnClose} onClick={onClose} aria-label="Cerrar carrito">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.body}>
              {items.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyEmoji}>🍽️</span>
                  <p className={styles.emptyTitle}>Carrito vacío</p>
                  <p className={styles.emptyText}>Agrega platos del menú para comenzar.</p>
                </div>
              ) : (
                <ul className={styles.list}>
                  {items.map((item) => {
                    const extrasActivos = item.extras ?? [];
                    const subtotal  = itemTotal(item.precio, extrasActivos, item.cantidad);
                    const descuento = descuentoPorItem.get(item.cartItemKey) ?? 0;
                    const promo     = promosPorItem.get(item.cartItemKey);
                    return (
                      <li key={item.cartItemKey} className={styles.item}>
                        <PlatoImage nombre={item.nombre} categoria={item.categoria ?? 'Platos fuertes'} imageUrl={item.imageUrl} size="sm" />
                        <div className={styles.itemMain}>
                          <div className={styles.itemTop}>
                            <p className={styles.itemNombre}>{item.nombre}</p>
                            <button className={styles.btnRemove} onClick={() => removeItem(item.cartItemKey)} aria-label={`Eliminar ${item.nombre}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                          {promo && (
                            <p className={styles.promoTag}>
                              🏷️ {promo.tag} · −{formatPrecio(descuento)}
                            </p>
                          )}
                          {extrasActivos.length > 0 && (
                            <p className={styles.personTag}>+ {extrasActivos.map((e) => `${e.nombre} ×${e.cantidad}`).join(', ')}</p>
                          )}
                          {(item.ingredientesRemovidos ?? []).length > 0 && (
                            <p className={styles.personTagRed}>Sin: {item.ingredientesRemovidos!.join(', ')}</p>
                          )}
                          {item.nota && <p className={styles.notaTag}>✏️ {item.nota}</p>}
                          <div className={styles.itemBottom}>
                            <div className={styles.qtyControl}>
                              <button className={styles.btnQty} onClick={() => updateCantidad(item.cartItemKey, item.cantidad - 1)}>−</button>
                              <span className={styles.qty}>{item.cantidad}</span>
                              <button className={styles.btnQty} onClick={() => updateCantidad(item.cartItemKey, item.cantidad + 1)}>+</button>
                            </div>
                            <div className={styles.itemSubtotalWrap}>
                              {descuento > 0 && <span className={styles.itemSubtotalOld}>{formatPrecio(subtotal)}</span>}
                              <span className={styles.itemSubtotal}>{formatPrecio(subtotal - descuento)}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className={styles.footer}>
                {descuentoTotal > 0 && (
                  <>
                    <div className={styles.totalRow} style={{ opacity: 0.6 }}>
                      <span className={styles.totalLabel}>Subtotal</span>
                      <span className={styles.totalValue}>{formatPrecio(total)}</span>
                    </div>
                    <div className={`${styles.totalRow} ${styles.descuentoRow}`}>
                      <span className={styles.totalLabel}>🏷️ Descuento promo</span>
                      <span className={styles.descuentoValue}>−{formatPrecio(descuentoTotal)}</span>
                    </div>
                  </>
                )}
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrecio(totalConDescuento)}</span>
                </div>
                <button className={styles.btnPagar} onClick={() => setStep('checkout')}>
                  Proceder al pago →
                </button>
                <p className={styles.payNote}>Precios incluyen IVA · Pago seguro</p>
              </div>
            )}
          </>
        )}

        {/* ── PASO: CHECKOUT ── */}
        {step === 'checkout' && (
          <>
            <div className={styles.header}>
              <button className={styles.btnBack} onClick={() => setStep('carrito')}>
                ← Volver
              </button>
              <h2 className={styles.title}>Finalizar pedido</h2>
              <button className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.checkoutForm}>

                {/* Tipo de pedido */}
                <div className={styles.checkoutField}>
                  <label className={styles.checkoutLabel}>¿Cómo recibes tu pedido?</label>
                  {mesaQr ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: '#9a3412', fontWeight: 500 }}>
                      🪑 Pedido en mesa — Mesa {mesaQr}
                    </div>
                  ) : (
                    <div className={styles.tipoGrid}>
                      {([
                        { valor: 'llevar',    emoji: '🥡', texto: 'Para llevar' },
                        { valor: 'domicilio', emoji: '🛵', texto: 'Domicilio'   },
                      ] as { valor: TipoPedido; emoji: string; texto: string }[]).map(({ valor, emoji, texto }) => (
                        <button
                          key={valor}
                          className={`${styles.tipoBtn} ${tipo === valor ? styles.tipoBtnActive : ''}`}
                          onClick={() => setTipo(valor)}
                        >
                          <span className={styles.tipoEmoji}>{emoji}</span>
                          <span>{texto}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mesa — solo disponible via QR; si viene de QR, la mesa ya está fija */}

                {/* Domicilio */}
                {tipo === 'domicilio' && (
                  <div className={styles.checkoutField}>
                    <label className={styles.checkoutLabel}>Dirección de entrega</label>
                    <input
                      type="text"
                      className={styles.checkoutInput}
                      placeholder="Calle 123 # 45-67, Barrio..."
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                )}

                {/* Resumen */}
                <div className={styles.resumen}>
                  <p className={styles.resumenTitle}>Resumen</p>
                  {items.map((item) => {
                    const desc = descuentoPorItem.get(item.cartItemKey) ?? 0;
                    const sub  = itemTotal(item.precio, item.extras ?? [], item.cantidad);
                    return (
                      <div key={item.cartItemKey} className={styles.resumenRow}>
                        <span>{item.nombre} ×{item.cantidad}</span>
                        <span>{formatPrecio(sub - desc)}</span>
                      </div>
                    );
                  })}
                  {descuentoTotal > 0 && (
                    <div className={`${styles.resumenRow} ${styles.descuentoRow}`}>
                      <span>🏷️ Descuentos aplicados</span>
                      <span className={styles.descuentoValue}>−{formatPrecio(descuentoTotal)}</span>
                    </div>
                  )}
                  <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
                    <span>Total (IVA inc.)</span>
                    <span>{formatPrecio(totalConDescuento)}</span>
                  </div>
                </div>

                {errorPedido && (
                  <p className={styles.pedidoError}>⚠ {errorPedido}</p>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.btnPagar} onClick={handleIrAPago}>
                Ir a pagar — {formatPrecio(totalConDescuento)}
              </button>
            </div>
          </>
        )}

        {/* ── PASO: PAGO ── */}
        {step === 'pago' && (
          <>
            <div className={styles.header}>
              <button className={styles.btnBack} onClick={() => setStep('checkout')}>
                ← Volver
              </button>
              <h2 className={styles.title}>Pago seguro</h2>
              <button className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.pagoStep}>

                {/* Resumen del total */}
                <div className={styles.pagoTotal}>
                  <span className={styles.pagoTotalLabel}>Total a pagar</span>
                  <span className={styles.pagoTotalVal}>{formatPrecio(totalConDescuento)}</span>
                </div>

                {/* Métodos aceptados */}
                <div className={styles.pagoMetodos}>
                  <p className={styles.pagoMetodosTitle}>Métodos aceptados</p>
                  <div className={styles.pagoMetodosGrid}>
                    {[
                      { emoji: '💳', label: 'Tarjeta' },
                      { emoji: '📱', label: 'Nequi' },
                      { emoji: '🏦', label: 'PSE' },
                      { emoji: '📲', label: 'Daviplata' },
                    ].map(({ emoji, label }) => (
                      <div key={label} className={styles.metodoBadge}>
                        <span>{emoji}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wompi badge */}
                <div className={styles.wompiBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Pago procesado de forma segura por <strong>Mercado Pago</strong></span>
                </div>

                {errorPago && <p className={styles.pedidoError}>⚠ {errorPago}</p>}
              </div>
            </div>

            <div className={styles.footer}>
              {showCardForm ? (
                simulatingPayment ? (
                  <div className={styles.payingOverlay}>
                    <div className={styles.payingSpinner} />
                    <p>Procesando pago seguro…</p>
                    <p className={styles.payingNote}>No cierres esta ventana</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.cardFormHeader}>
                      <button type="button" className={styles.cardFormBackBtn} onClick={() => setShowCardForm(false)}>
                        ← Volver
                      </button>
                      <span className={styles.cardFormTitle}>💳 Datos de tarjeta</span>
                    </div>
                    <form className={styles.cardForm} onSubmit={handlePagarSimulado}>
                      <input className={styles.cardInput} type="text" placeholder="1234 5678 9012 3456"
                        value={cardNum} onChange={handleCardNumChange} maxLength={19} required autoComplete="cc-number" />
                      <input className={styles.cardInput} type="text" placeholder="NOMBRE DEL TITULAR"
                        value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} required autoComplete="cc-name" />
                      <div className={styles.cardRow}>
                        <input className={styles.cardInput} type="text" placeholder="MM/AA"
                          value={cardExpiry} onChange={handleExpiryChange} maxLength={5} required autoComplete="cc-exp" />
                        <input className={styles.cardInput} type="password" placeholder="CVV"
                          value={cardCVV} onChange={e => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} required autoComplete="cc-csc" />
                      </div>
                      <button type="submit" className={styles.btnPagar} disabled={cargandoEfectivo}>
                        {cargandoEfectivo ? 'Registrando…' : `🔒 Pagar ${formatPrecio(totalConDescuento)}`}
                      </button>
                    </form>
                  </>
                )
              ) : (
                <>
                  <button
                    className={styles.btnPagar}
                    onClick={handleLanzarPago}
                    disabled={cargandoPago || cargandoEfectivo}
                  >
                    {cargandoPago
                      ? 'Redirigiendo a Mercado Pago…'
                      : `Pagar con Mercado Pago — ${formatPrecio(totalConDescuento)}`}
                  </button>
                  <div className={styles.dividerOr}><span>o</span></div>
                  <button
                    className={styles.btnEfectivo}
                    onClick={() => setShowCardForm(true)}
                    disabled={cargandoPago}
                  >
                    💳 Pagar con tarjeta
                  </button>
                  <p className={styles.payNote}>Pago procesado de forma segura por Mercado Pago</p>
                </>
              )}
            </div>
          </>
        )}

        {/* ── PASO: CONFIRMADO (efectivo) ── */}
        {step === 'confirmado' && pedidoConfirmado && (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Pedido registrado</h2>
              <button className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.confirmadoStep}>
                <div className={styles.confirmadoIcon}>
                  <svg viewBox="0 0 52 52" fill="none" width="56" height="56">
                    <circle cx="26" cy="26" r="26" fill="#22c55e" />
                    <path d="M14 26l8 8 16-16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className={styles.confirmadoTitle}>¡Pedido enviado a cocina!</h3>
                <p className={styles.confirmadoSub}>Acércate al mostrador cuando esté listo para recogerlo.</p>

                <div className={styles.confirmadoBox}>
                  <div className={styles.confirmadoRow}>
                    <span>Pedido</span>
                    <span>#{pedidoConfirmado.pedidoId}</span>
                  </div>
                  <div className={styles.confirmadoRow}>
                    <span>Total</span>
                    <span>{formatPrecio(pedidoConfirmado.total)}</span>
                  </div>
                  <div className={styles.confirmadoRow}>
                    <span>Tipo</span>
                    <span>
                      {pedidoConfirmado.tipo === 'mesa'       ? '🪑 En mesa'
                       : pedidoConfirmado.tipo === 'domicilio' ? '🛵 Domicilio'
                       : '🥡 Para llevar'}
                    </span>
                  </div>
                  <div className={styles.confirmadoRow}>
                    <span>Referencia</span>
                    <span className={styles.confirmadoRef}>{pedidoConfirmado.referencia}</span>
                  </div>
                </div>

                {/* Opt-in notificaciones push */}
                {swReady && permission !== 'granted' && permission !== 'denied' && permission !== 'unsupported' && (
                  <div className={styles.pushBanner}>
                    {!pushSolicitado ? (
                      <button className={styles.btnPush} onClick={handleSolicitarPush}>
                        🔔 Avísame cuando mi pedido esté listo
                      </button>
                    ) : (
                      <p className={styles.pushGranted}>✅ Te notificaremos cuando cambie el estado de tu pedido</p>
                    )}
                  </div>
                )}

                {qrToken && (
                  <div className={styles.confirmadoQr}>
                    <p className={styles.confirmadoQrLabel}>
                      Muestra este QR cuando te entreguen el pedido
                    </p>
                    <div className={styles.confirmadoQrBox}>
                      <QRCodeSVG
                        value={`${window.location.origin}/confirmar-entrega?token=${qrToken}`}
                        size={180}
                        level="M"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.btnPagar} onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )}

        {/* La confirmación tras el pago con MP ocurre en /pago-resultado (PagoResultadoPage) */}
      </aside>
    </>
  );
}
