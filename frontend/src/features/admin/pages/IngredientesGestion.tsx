import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import styles from './IngredientesGestion.module.css';

type Stock = 'ok' | 'bajo' | 'agotado';

interface Ingrediente {
  id: number;
  nombre: string;
  stock: Stock;
  platoIds: number[];
}

const PLATOS_NOMBRE: Record<number, string> = {
  1: 'Bandeja Paisa', 2: 'Ajiaco Bogotano', 3: 'Empanadas (x3)',
  4: 'Jugo de Lulo', 5: 'Sancocho de Gallina', 6: 'Patacones con Hogao',
  7: 'Agua Panela', 8: 'Arroz con Leche',
};

const INGREDIENTES_INIT: Ingrediente[] = [
  { id: 1, nombre: 'Fríjoles', stock: 'ok', platoIds: [1] },
  { id: 2, nombre: 'Arroz', stock: 'ok', platoIds: [1, 2, 5] },
  { id: 3, nombre: 'Carne molida', stock: 'ok', platoIds: [1] },
  { id: 4, nombre: 'Chicharrón', stock: 'bajo', platoIds: [1] },
  { id: 5, nombre: 'Aguacate', stock: 'ok', platoIds: [1, 6] },
  { id: 6, nombre: 'Pollo criollo', stock: 'ok', platoIds: [2, 5] },
  { id: 7, nombre: 'Papa criolla', stock: 'bajo', platoIds: [2, 5] },
  { id: 8, nombre: 'Mazorca', stock: 'ok', platoIds: [2, 5] },
  { id: 9, nombre: 'Guascas', stock: 'agotado', platoIds: [2] },
  { id: 10, nombre: 'Masa de maíz', stock: 'ok', platoIds: [3] },
  { id: 11, nombre: 'Pipián', stock: 'ok', platoIds: [3] },
  { id: 12, nombre: 'Lulo', stock: 'ok', platoIds: [4] },
  { id: 13, nombre: 'Yuca', stock: 'ok', platoIds: [5] },
  { id: 14, nombre: 'Patacón', stock: 'ok', platoIds: [6] },
  { id: 15, nombre: 'Hogao', stock: 'bajo', platoIds: [6] },
  { id: 16, nombre: 'Panela', stock: 'ok', platoIds: [7] },
  { id: 17, nombre: 'Leche condensada', stock: 'ok', platoIds: [8] },
  { id: 18, nombre: 'Canela', stock: 'ok', platoIds: [8] },
];

const STOCK_CONFIG: Record<Stock, { label: string; color: string; bg: string }> = {
  ok:      { label: 'Disponible', color: '#15803d', bg: '#dcfce7' },
  bajo:    { label: 'Stock bajo',  color: '#b45309', bg: '#fef3c7' },
  agotado: { label: 'Agotado',     color: '#b91c1c', bg: '#fee2e2' },
};

type FiltroStock = Stock | 'todos';
type ModalMode = { mode: 'crear' } | { mode: 'editar'; id: number } | null;
const EMPTY_FORM = { nombre: '', stock: 'ok' as Stock, platoIds: [] as number[] };

export function IngredientesGestion() {
  const [ingredientes, setIngredientes] = useState(INGREDIENTES_INIT);
  const [filtro, setFiltro] = useState<FiltroStock>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const lista = ingredientes.filter((ing) => {
    const matchFiltro = filtro === 'todos' || ing.stock === filtro;
    const matchBusq = ing.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusq;
  });

  // Platos afectados por agotados/bajos
  const platosAfectados = new Set(
    ingredientes
      .filter((i) => i.stock === 'agotado')
      .flatMap((i) => i.platoIds),
  );

  const platosRiesgo = new Set(
    ingredientes
      .filter((i) => i.stock === 'bajo')
      .flatMap((i) => i.platoIds),
  );

  function setStock(id: number, stock: Stock) {
    setIngredientes((prev) => prev.map((i) => (i.id === id ? { ...i, stock } : i)));
  }

  function openEditar(ing: Ingrediente) {
    setForm({ nombre: ing.nombre, stock: ing.stock, platoIds: [...ing.platoIds] });
    setModal({ mode: 'editar', id: ing.id });
  }

  function handleGuardar() {
    if (!form.nombre.trim()) return;
    if (modal?.mode === 'crear') {
      setIngredientes((prev) => [...prev, { id: Date.now(), ...form }]);
    } else if (modal?.mode === 'editar') {
      const { id } = modal;
      setIngredientes((prev) => prev.map((i) => (i.id === id ? { ...i, ...form } : i)));
    }
    setModal(null);
  }

  function togglePlatoInForm(platoId: number) {
    setForm((f) => ({
      ...f,
      platoIds: f.platoIds.includes(platoId)
        ? f.platoIds.filter((p) => p !== platoId)
        : [...f.platoIds, platoId],
    }));
  }

  const agotados = ingredientes.filter((i) => i.stock === 'agotado').length;
  const bajos = ingredientes.filter((i) => i.stock === 'bajo').length;

  return (
    <AdminLayout title="Ingredientes">
      <div className={styles.wrapper}>
        {/* Alertas */}
        {agotados > 0 && (
          <div className={styles.alert} style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
            <span className={styles.alertIcon}>🚨</span>
            <div>
              <p className={styles.alertTitle}>{agotados} ingrediente{agotados > 1 ? 's' : ''} agotado{agotados > 1 ? 's' : ''}</p>
              <p className={styles.alertText}>
                Platos afectados: {[...platosAfectados].map((id) => PLATOS_NOMBRE[id]).join(', ')}
              </p>
            </div>
          </div>
        )}
        {bajos > 0 && (
          <div className={styles.alert} style={{ borderColor: '#fcd34d', background: '#fffbeb' }}>
            <span className={styles.alertIcon}>⚠️</span>
            <div>
              <p className={styles.alertTitle}>{bajos} ingrediente{bajos > 1 ? 's' : ''} con stock bajo</p>
              <p className={styles.alertText}>
                Platos en riesgo: {[...platosRiesgo].filter((id) => !platosAfectados.has(id)).map((id) => PLATOS_NOMBRE[id]).join(', ') || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.leftTools}>
            <input
              type="search"
              className={styles.search}
              placeholder="Buscar ingrediente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className={styles.filtros}>
              {(['todos', 'ok', 'bajo', 'agotado'] as FiltroStock[]).map((f) => {
                const cfg = f === 'todos' ? null : STOCK_CONFIG[f];
                return (
                  <button
                    key={f}
                    className={`${styles.chip} ${filtro === f ? styles.chipActive : ''}`}
                    style={filtro === f && cfg ? { background: cfg.color, borderColor: cfg.color, color: '#fff' } : {}}
                    onClick={() => setFiltro(f)}
                  >
                    {f === 'todos' ? 'Todos' : cfg!.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button className={styles.btnNuevo} onClick={() => { setForm(EMPTY_FORM); setModal({ mode: 'crear' }); }}>
            + Nuevo ingrediente
          </button>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Stock</th>
                <th>Platos que lo usan</th>
                <th>Cambiar stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((ing) => {
                const cfg = STOCK_CONFIG[ing.stock];
                return (
                  <tr key={ing.id}>
                    <td className={styles.nombre}>{ing.nombre}</td>
                    <td>
                      <span className={styles.stockBadge} style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td>
                      <div className={styles.platosTags}>
                        {ing.platoIds.map((pid) => (
                          <span
                            key={pid}
                            className={styles.platoTag}
                            style={platosAfectados.has(pid) ? { borderColor: '#fca5a5', color: '#b91c1c' } : {}}
                          >
                            {PLATOS_NOMBRE[pid] ?? `Plato ${pid}`}
                          </span>
                        ))}
                        {ing.platoIds.length === 0 && <span className={styles.noPlatos}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div className={styles.stockControls}>
                        {(['ok', 'bajo', 'agotado'] as Stock[]).map((s) => (
                          <button
                            key={s}
                            className={`${styles.stockBtn} ${ing.stock === s ? styles.stockBtnActive : ''}`}
                            style={ing.stock === s ? { background: STOCK_CONFIG[s].bg, color: STOCK_CONFIG[s].color, borderColor: STOCK_CONFIG[s].color } : {}}
                            onClick={() => setStock(ing.id, s)}
                          >
                            {s === 'ok' ? '✓ OK' : s === 'bajo' ? '⚠ Bajo' : '✕ Agotado'}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className={styles.btnEdit} onClick={() => openEditar(ing)}>✏️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.count}>{lista.length} ingredientes</p>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal.mode === 'crear' ? '➕ Nuevo ingrediente' : '✏️ Editar ingrediente'}
            </h3>
            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>Nombre</label>
                <input type="text" className={styles.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Pollo criollo" />
              </div>
              <div className={styles.modalField}>
                <label>Estado de stock</label>
                <select className={styles.input} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value as Stock })}>
                  <option value="ok">Disponible</option>
                  <option value="bajo">Stock bajo</option>
                  <option value="agotado">Agotado</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label>Platos que lo usan</label>
                <div className={styles.platosCheckGrid}>
                  {Object.entries(PLATOS_NOMBRE).map(([pid, nombre]) => (
                    <label key={pid} className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={form.platoIds.includes(Number(pid))}
                        onChange={() => togglePlatoInForm(Number(pid))}
                      />
                      {nombre}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleGuardar}>
                {modal.mode === 'crear' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
