import { useCarrito } from '../context/CarritoContext';
import { PlatoImage } from '@/shared/components/PlatoImage';
import styles from './CartDrawer.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

function itemTotal(precio: number, extras: { precio: number; cantidad: number }[], cantidad: number) {
  const extrasSum = extras.reduce((s, e) => s + e.precio * e.cantidad, 0);
  return (precio + extrasSum) * cantidad;
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, count, total, removeItem, updateCantidad, clearCart } = useCarrito();

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`${styles.panel} ${open ? styles.panelOpen : ''}`} aria-label="Carrito de compras">
        {/* Header */}
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

        {/* Body */}
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
                    {/* Imagen */}
                    <PlatoImage
                      nombre={item.nombre}
                      categoria={item.categoria ?? 'Platos fuertes'}
                      size="sm"
                    />

                    {/* Info + personalizaciones */}
                    <div className={styles.itemMain}>
                      <div className={styles.itemTop}>
                        <p className={styles.itemNombre}>{item.nombre}</p>
                        <button
                          className={styles.btnRemove}
                          onClick={() => removeItem(item.platoId)}
                          aria-label={`Eliminar ${item.nombre}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      {/* Extras */}
                      {extrasActivos.length > 0 && (
                        <p className={styles.personTag}>
                          + {extrasActivos.map((e) => `${e.nombre} ×${e.cantidad}`).join(', ')}
                        </p>
                      )}

                      {/* Ingredientes removidos */}
                      {(item.ingredientesRemovidos ?? []).length > 0 && (
                        <p className={styles.personTagRed}>
                          Sin: {item.ingredientesRemovidos!.join(', ')}
                        </p>
                      )}

                      {/* Nota */}
                      {item.nota && (
                        <p className={styles.notaTag}>✏️ {item.nota}</p>
                      )}

                      {/* Precio + controles */}
                      <div className={styles.itemBottom}>
                        <div className={styles.qtyControl}>
                          <button
                            className={styles.btnQty}
                            onClick={() => updateCantidad(item.platoId, item.cantidad - 1)}
                            aria-label="Reducir"
                          >−</button>
                          <span className={styles.qty}>{item.cantidad}</span>
                          <button
                            className={styles.btnQty}
                            onClick={() => updateCantidad(item.platoId, item.cantidad + 1)}
                            aria-label="Aumentar"
                          >+</button>
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

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.totalValue}>{formatPrecio(total)}</span>
            </div>
            <button className={styles.btnPagar}>Proceder al pago →</button>
            <p className={styles.payNote}>Pago seguro — múltiples métodos</p>
          </div>
        )}
      </aside>
    </>
  );
}
