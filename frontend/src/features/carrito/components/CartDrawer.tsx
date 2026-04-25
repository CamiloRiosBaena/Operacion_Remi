import { useEffect, useState } from 'react';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PlatoImage } from '@/shared/components/PlatoImage';
import {
  createPedido,
  fetchMesas,
  type TipoPedido,
  type Mesa,
} from '@/features/pedidos/services/pedidos.service';
import styles from './CartDrawer.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  mesaQr?: number;
}

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

function itemTotal(precio: number, extras: { precio: number; cantidad: number }[], cantidad: number) {
  const extrasSum = extras.reduce((s, e) => s + e.precio * e.cantidad, 0);
  return (precio + extrasSum) * cantidad;
}

// ── Paso de checkout ──────────────────────────────────────────────────────────
type Step = 'carrito' | 'checkout' | 'confirmado';

export function CartDrawer({ open, onClose, mesaQr }: Props) {
  const { items, count, total, ivaTotal, totalConIva, removeItem, updateCantidad, clearCart } = useCarrito();
  const { user } = useAuth();

  const [step, setStep]             = useState<Step>('carrito');
  const [tipo, setTipo]             = useState<TipoPedido>(mesaQr ? 'mesa' : 'llevar');
  const [mesaId, setMesaId]         = useState<number | ''>(mesaQr ?? '');
  const [direccion, setDireccion]   = useState('');
  const [mesas, setMesas]           = useState<Mesa[]>([]);
  const [enviando, setEnviando]     = useState(false);
  const [errorPedido, setErrorPedido] = useState('');
  const [pedidoId, setPedidoId]     = useState<number | null>(null);

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

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        if (step === 'confirmado') {
          setStep('carrito');
          setTipo(mesaQr ? 'mesa' : 'llevar');
          setMesaId(mesaQr ?? '');
          setDireccion('');
          setPedidoId(null);
        }
      }, 300);
    }
  }, [open, step, mesaQr]);

  async function handlePedir() {
    if (tipo === 'mesa' && !mesaId) { setErrorPedido('Selecciona una mesa'); return; }
    if (tipo === 'domicilio' && !direccion.trim()) { setErrorPedido('Ingresa la dirección de entrega'); return; }

    setEnviando(true);
    setErrorPedido('');
    try {
      const detalles = items.map((item) => ({
        platoId: item.platoId,
        cantidad: item.cantidad,
        personalizacion: (item.ingredientesRemovidos?.length || item.extras?.length || item.nota)
          ? JSON.stringify({
              removidos: item.ingredientesRemovidos ?? [],
              extras: item.extras ?? [],
              nota: item.nota ?? '',
            })
          : undefined,
      }));

      const pedido = await createPedido({
        tipo,
        clienteId: user ? Number(user.id) : undefined,
        mesaId: tipo === 'mesa' && mesaId ? Number(mesaId) : undefined,
        direccionEntrega: tipo === 'domicilio' ? direccion : undefined,
        detalles,
      });

      setPedidoId(pedido.id);
      clearCart();
      setStep('confirmado');
    } catch (err) {
      setErrorPedido(err instanceof Error ? err.message : 'Error al enviar el pedido');
    } finally {
      setEnviando(false);
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
                    const subtotal = itemTotal(item.precio, extrasActivos, item.cantidad);
                    return (
                      <li key={item.platoId} className={styles.item}>
                        <PlatoImage nombre={item.nombre} categoria={item.categoria ?? 'Platos fuertes'} size="sm" />
                        <div className={styles.itemMain}>
                          <div className={styles.itemTop}>
                            <p className={styles.itemNombre}>{item.nombre}</p>
                            <button className={styles.btnRemove} onClick={() => removeItem(item.platoId)} aria-label={`Eliminar ${item.nombre}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                          {extrasActivos.length > 0 && (
                            <p className={styles.personTag}>+ {extrasActivos.map((e) => `${e.nombre} ×${e.cantidad}`).join(', ')}</p>
                          )}
                          {(item.ingredientesRemovidos ?? []).length > 0 && (
                            <p className={styles.personTagRed}>Sin: {item.ingredientesRemovidos!.join(', ')}</p>
                          )}
                          {item.nota && <p className={styles.notaTag}>✏️ {item.nota}</p>}
                          <div className={styles.itemBottom}>
                            <div className={styles.qtyControl}>
                              <button className={styles.btnQty} onClick={() => updateCantidad(item.platoId, item.cantidad - 1)}>−</button>
                              <span className={styles.qty}>{item.cantidad}</span>
                              <button className={styles.btnQty} onClick={() => updateCantidad(item.platoId, item.cantidad + 1)}>+</button>
                            </div>
                            <span className={styles.itemSubtotal}>{formatPrecio(subtotal)}</span>
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
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrecio(total)}</span>
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
                        { valor: 'llevar',   emoji: '🥡', texto: 'Para llevar' },
                        { valor: 'mesa',     emoji: '🪑', texto: 'En mesa'     },
                        { valor: 'domicilio',emoji: '🛵', texto: 'Domicilio'   },
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

                {/* Mesa — si NO viene de QR, dejar seleccionar; si viene de QR ya está fija */}
                {tipo === 'mesa' && !mesaQr && (
                  <div className={styles.checkoutField}>
                    <label className={styles.checkoutLabel}>Selecciona tu mesa</label>
                    {mesas.length === 0 ? (
                      <p className={styles.checkoutHint}>Cargando mesas…</p>
                    ) : (
                      <div className={styles.mesaGrid}>
                        {mesas.map((m) => (
                          <button
                            key={m.id}
                            className={`${styles.mesaBtn} ${mesaId === m.id ? styles.mesaBtnActive : ''} ${m.estado === 'ocupada' ? styles.mesaOcupada : ''}`}
                            onClick={() => setMesaId(m.id)}
                            disabled={m.estado === 'ocupada'}
                          >
                            Mesa {m.numero}
                            {m.estado === 'ocupada' && <span className={styles.mesaTag}>ocupada</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                  {items.map((item) => (
                    <div key={item.platoId} className={styles.resumenRow}>
                      <span>{item.nombre} ×{item.cantidad}</span>
                      <span>{formatPrecio(itemTotal(item.precio, item.extras ?? [], item.cantidad))}</span>
                    </div>
                  ))}
                  <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
                    <span>Total (IVA inc.)</span>
                    <span>{formatPrecio(total)}</span>
                  </div>
                </div>

                {errorPedido && (
                  <p className={styles.pedidoError}>⚠ {errorPedido}</p>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <button className={styles.btnPagar} onClick={handlePedir} disabled={enviando}>
                {enviando ? 'Enviando pedido…' : `Confirmar pedido — ${formatPrecio(total)}`}
              </button>
            </div>
          </>
        )}

        {/* ── PASO: CONFIRMADO ── */}
        {step === 'confirmado' && (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Pedido enviado</h2>
              <button className={styles.btnClose} onClick={onClose} aria-label="Cerrar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.body}>
              <div className={styles.confirmado}>
                <div className={styles.confirmadoEmoji}>✅</div>
                <h3 className={styles.confirmadoTitle}>¡Pedido #{pedidoId} recibido!</h3>
                <p className={styles.confirmadoText}>
                  Tu pedido fue enviado a cocina.{' '}
                  {tipo === 'domicilio' && 'Pronto un domiciliario saldrá hacia tu dirección.'}
                  {tipo === 'mesa' && 'Lo llevaremos a tu mesa en un momento.'}
                  {tipo === 'llevar' && 'Pasa a recogerlo cuando esté listo.'}
                </p>
                <button className={styles.btnPagar} onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
