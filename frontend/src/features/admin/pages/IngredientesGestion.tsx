import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import styles from './IngredientesGestion.module.css';

// ── Tipos ────────────────────────────────────────────────────────────────────

type Stock = 'ok' | 'bajo' | 'agotado';

interface Ingrediente {
  id: number;
  nombre: string;
  unidadCompra: string;         // "bulto", "caja", "kg", "litro"…
  gramosPorUnidad: number;      // gramos en cada unidad comprada
  stockUnidades: number;        // unidades actuales en bodega
  stockMinimoPorciones: number; // alerta cuando porciones < este valor
  eliminable: boolean;          // el cliente puede pedirlo quitado
}

interface PlatoIngrediente {
  platoId: number;
  ingredienteId: number;
  gramosPorPorcion: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function gramosTotales(ing: Ingrediente) {
  return ing.stockUnidades * ing.gramosPorUnidad;
}

/** Retorna las porciones mínimas posibles de todos los platos que usan este ingrediente */
function porcionesEstimadas(ing: Ingrediente, relaciones: PlatoIngrediente[]): number | null {
  const rels = relaciones.filter((r) => r.ingredienteId === ing.id);
  if (rels.length === 0) return null;
  const gramos = gramosTotales(ing);
  return Math.min(...rels.map((r) => Math.floor(gramos / r.gramosPorPorcion)));
}

function calcStock(ing: Ingrediente, relaciones: PlatoIngrediente[]): Stock {
  if (ing.stockUnidades === 0) return 'agotado';
  const p = porcionesEstimadas(ing, relaciones);
  if (p !== null && p < ing.stockMinimoPorciones) return 'bajo';
  return 'ok';
}

function fmtGramos(g: number) {
  if (g >= 1_000_000) return `${(g / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} t`;
  if (g >= 1_000)     return `${(g / 1_000).toLocaleString('es-CO',     { maximumFractionDigits: 1 })} kg`;
  return `${g.toLocaleString('es-CO')} g`;
}

function fmtNum(n: number) { return n.toLocaleString('es-CO'); }

const STOCK_CONFIG: Record<Stock, { label: string; color: string; bg: string }> = {
  ok:      { label: 'Disponible', color: '#15803d', bg: '#dcfce7' },
  bajo:    { label: 'Stock bajo',  color: '#b45309', bg: '#fef3c7' },
  agotado: { label: 'Agotado',     color: '#b91c1c', bg: '#fee2e2' },
};

const UNIDADES_COMPRA = ['bulto', 'caja', 'kg', 'litro', 'racimo', 'paca', 'unidad'];

// ── Datos iniciales ──────────────────────────────────────────────────────────

const INGREDIENTES_INIT: Ingrediente[] = [
  { id: 1,  nombre: 'Fríjoles rojos',  unidadCompra: 'bulto',  gramosPorUnidad: 50000, stockUnidades: 3,  stockMinimoPorciones: 20, eliminable: true  },
  { id: 2,  nombre: 'Arroz',           unidadCompra: 'bulto',  gramosPorUnidad: 50000, stockUnidades: 5,  stockMinimoPorciones: 30, eliminable: false },
  { id: 3,  nombre: 'Carne molida',    unidadCompra: 'kg',     gramosPorUnidad: 1000,  stockUnidades: 8,  stockMinimoPorciones: 10, eliminable: true  },
  { id: 4,  nombre: 'Chicharrón',      unidadCompra: 'kg',     gramosPorUnidad: 1000,  stockUnidades: 2,  stockMinimoPorciones: 15, eliminable: true  },
  { id: 5,  nombre: 'Aguacate',        unidadCompra: 'caja',   gramosPorUnidad: 18000, stockUnidades: 2,  stockMinimoPorciones: 20, eliminable: true  },
  { id: 6,  nombre: 'Pollo criollo',   unidadCompra: 'kg',     gramosPorUnidad: 1000,  stockUnidades: 12, stockMinimoPorciones: 10, eliminable: false },
  { id: 7,  nombre: 'Papa criolla',    unidadCompra: 'bulto',  gramosPorUnidad: 25000, stockUnidades: 1,  stockMinimoPorciones: 20, eliminable: false },
  { id: 8,  nombre: 'Mazorca',         unidadCompra: 'caja',   gramosPorUnidad: 12000, stockUnidades: 3,  stockMinimoPorciones: 15, eliminable: false },
  { id: 9,  nombre: 'Guascas',         unidadCompra: 'kg',     gramosPorUnidad: 1000,  stockUnidades: 0,  stockMinimoPorciones: 5,  eliminable: false },
  { id: 10, nombre: 'Masa de maíz',    unidadCompra: 'bulto',  gramosPorUnidad: 25000, stockUnidades: 2,  stockMinimoPorciones: 30, eliminable: false },
  { id: 11, nombre: 'Lulo',            unidadCompra: 'caja',   gramosPorUnidad: 8000,  stockUnidades: 4,  stockMinimoPorciones: 20, eliminable: false },
  { id: 12, nombre: 'Plátano verde',   unidadCompra: 'racimo', gramosPorUnidad: 15000, stockUnidades: 3,  stockMinimoPorciones: 20, eliminable: false },
  { id: 13, nombre: 'Panela',          unidadCompra: 'paca',   gramosPorUnidad: 20000, stockUnidades: 2,  stockMinimoPorciones: 40, eliminable: false },
  { id: 14, nombre: 'Leche',           unidadCompra: 'litro',  gramosPorUnidad: 1000,  stockUnidades: 20, stockMinimoPorciones: 50, eliminable: false },
];

/**
 * Cada fila indica: el plato X usa Y gramos de este ingrediente por porción.
 * De aquí se calcula: porciones posibles = gramos disponibles ÷ gramosPorPorcion
 */
const RELACIONES_INIT: PlatoIngrediente[] = [
  // Bandeja Paisa (id 1)
  { platoId: 1, ingredienteId: 1,  gramosPorPorcion: 200 },
  { platoId: 1, ingredienteId: 2,  gramosPorPorcion: 150 },
  { platoId: 1, ingredienteId: 3,  gramosPorPorcion: 120 },
  { platoId: 1, ingredienteId: 4,  gramosPorPorcion: 100 },
  { platoId: 1, ingredienteId: 5,  gramosPorPorcion: 80  },
  // Ajiaco Bogotano (id 2)
  { platoId: 2, ingredienteId: 6,  gramosPorPorcion: 250 },
  { platoId: 2, ingredienteId: 7,  gramosPorPorcion: 200 },
  { platoId: 2, ingredienteId: 8,  gramosPorPorcion: 100 },
  { platoId: 2, ingredienteId: 9,  gramosPorPorcion: 5   },
  // Empanadas (id 3)
  { platoId: 3, ingredienteId: 10, gramosPorPorcion: 100 },
  // Jugo de Lulo (id 4)
  { platoId: 4, ingredienteId: 11, gramosPorPorcion: 150 },
  // Sancocho de Gallina (id 5)
  { platoId: 5, ingredienteId: 6,  gramosPorPorcion: 300 },
  { platoId: 5, ingredienteId: 7,  gramosPorPorcion: 200 },
  { platoId: 5, ingredienteId: 8,  gramosPorPorcion: 150 },
  // Patacones con Hogao (id 6)
  { platoId: 6, ingredienteId: 12, gramosPorPorcion: 200 },
  { platoId: 6, ingredienteId: 5,  gramosPorPorcion: 50  },
  // Agua Panela con Limón (id 7)
  { platoId: 7, ingredienteId: 13, gramosPorPorcion: 100 },
  // Arroz con Leche (id 8)
  { platoId: 8, ingredienteId: 2,  gramosPorPorcion: 80  },
  { platoId: 8, ingredienteId: 14, gramosPorPorcion: 200 },
];

// ── Form state ───────────────────────────────────────────────────────────────

type FiltroStock = Stock | 'todos';
type ModalMode = { mode: 'crear' } | { mode: 'editar'; id: number } | null;

interface FormRelacion { platoId: number; gramos: string; activo: boolean; }

interface FormState {
  nombre: string;
  unidadCompra: string;
  gramosPorUnidad: string;
  stockUnidades: string;
  stockMinimoPorciones: string;
  eliminable: boolean;
  relaciones: FormRelacion[];
}

function buildEmptyForm(platosIds: number[]): FormState {
  return {
    nombre: '', unidadCompra: 'kg', gramosPorUnidad: '1000',
    stockUnidades: '0', stockMinimoPorciones: '10', eliminable: true,
    relaciones: platosIds.map((id) => ({ platoId: id, gramos: '', activo: false })),
  };
}

function buildEditForm(ing: Ingrediente, relaciones: PlatoIngrediente[], platosIds: number[]): FormState {
  return {
    nombre: ing.nombre,
    unidadCompra: ing.unidadCompra,
    gramosPorUnidad: String(ing.gramosPorUnidad),
    stockUnidades: String(ing.stockUnidades),
    stockMinimoPorciones: String(ing.stockMinimoPorciones),
    eliminable: ing.eliminable,
    relaciones: platosIds.map((pid) => {
      const rel = relaciones.find((r) => r.platoId === pid && r.ingredienteId === ing.id);
      return { platoId: pid, gramos: rel ? String(rel.gramosPorPorcion) : '', activo: !!rel };
    }),
  };
}

// ── Componente principal ─────────────────────────────────────────────────────

export function IngredientesGestion() {
  const { platos } = usePlatos();

  const [ingredientes, setIngredientes] = useState(INGREDIENTES_INIT);
  const [relaciones,   setRelaciones  ] = useState<PlatoIngrediente[]>(RELACIONES_INIT);
  const [filtro,       setFiltro      ] = useState<FiltroStock>('todos');
  const [busqueda,     setBusqueda    ] = useState('');
  const [modal,        setModal       ] = useState<ModalMode>(null);
  const [form,         setForm        ] = useState<FormState>(() => buildEmptyForm(platos.map((p) => p.id)));

  // ── Datos derivados ─────────────────────────────────────────────────────

  const lista = ingredientes.filter((ing) => {
    const estado = calcStock(ing, relaciones);
    const matchFiltro = filtro === 'todos' || estado === filtro;
    const matchBusq   = ing.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusq;
  });

  const agotados = ingredientes.filter((i) => calcStock(i, relaciones) === 'agotado');
  const bajos    = ingredientes.filter((i) => calcStock(i, relaciones) === 'bajo');

  // Platos afectados por ingredientes agotados
  const platosAfectados = new Set(
    agotados.flatMap((i) => relaciones.filter((r) => r.ingredienteId === i.id).map((r) => r.platoId))
  );
  const platosRiesgo = new Set(
    bajos.flatMap((i) => relaciones.filter((r) => r.ingredienteId === i.id).map((r) => r.platoId))
  );

  // ── Acciones ────────────────────────────────────────────────────────────

  function openCrear() {
    setForm(buildEmptyForm(platos.map((p) => p.id)));
    setModal({ mode: 'crear' });
  }

  function openEditar(ing: Ingrediente) {
    setForm(buildEditForm(ing, relaciones, platos.map((p) => p.id)));
    setModal({ mode: 'editar', id: ing.id });
  }

  function handleGuardar() {
    const gramosPorUnidad      = parseFloat(form.gramosPorUnidad);
    const stockUnidades        = parseFloat(form.stockUnidades);
    const stockMinimoPorciones = parseInt(form.stockMinimoPorciones);
    if (!form.nombre.trim() || isNaN(gramosPorUnidad) || isNaN(stockUnidades)) return;

    const ingData: Ingrediente = {
      id: modal?.mode === 'editar' ? modal.id : Date.now(),
      nombre: form.nombre,
      unidadCompra: form.unidadCompra,
      gramosPorUnidad,
      stockUnidades,
      stockMinimoPorciones: isNaN(stockMinimoPorciones) ? 10 : stockMinimoPorciones,
      eliminable: form.eliminable,
    };

    // Actualiza la lista de ingredientes
    setIngredientes((prev) =>
      modal?.mode === 'crear'
        ? [...prev, ingData]
        : prev.map((i) => (i.id === ingData.id ? ingData : i))
    );

    // Actualiza relaciones plato-ingrediente
    const nuevasRels: PlatoIngrediente[] = form.relaciones
      .filter((r) => r.activo && r.gramos.trim() !== '')
      .map((r) => ({
        platoId: r.platoId,
        ingredienteId: ingData.id,
        gramosPorPorcion: parseFloat(r.gramos) || 0,
      }));

    setRelaciones((prev) => [
      ...prev.filter((r) => r.ingredienteId !== ingData.id),
      ...nuevasRels,
    ]);

    setModal(null);
  }

  function toggleRelacion(platoId: number) {
    setForm((f) => ({
      ...f,
      relaciones: f.relaciones.map((r) =>
        r.platoId === platoId ? { ...r, activo: !r.activo, gramos: r.activo ? '' : r.gramos } : r
      ),
    }));
  }

  function setGramos(platoId: number, gramos: string) {
    setForm((f) => ({
      ...f,
      relaciones: f.relaciones.map((r) => (r.platoId === platoId ? { ...r, gramos } : r)),
    }));
  }

  // ── Conversor (calculado a partir de los valores del form) ───────────────

  const convGramosPorUnidad = parseFloat(form.gramosPorUnidad) || 0;
  const convStockUnidades   = parseFloat(form.stockUnidades)   || 0;
  const convTotalGramos     = convStockUnidades * convGramosPorUnidad;

  const convResultados = form.relaciones
    .filter((r) => r.activo && parseFloat(r.gramos) > 0)
    .map((r) => {
      const plato        = platos.find((p) => p.id === r.platoId);
      const gramosPorP   = parseFloat(r.gramos);
      const porciones    = gramosPorP > 0 ? Math.floor(convTotalGramos / gramosPorP) : 0;
      return { nombre: plato?.nombre ?? `Plato ${r.platoId}`, gramosPorP, porciones };
    });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Ingredientes">
      <div className={styles.wrapper}>

        {/* ── Alertas ── */}
        {agotados.length > 0 && (
          <div className={styles.alert} style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
            <span className={styles.alertIcon}>🚨</span>
            <div>
              <p className={styles.alertTitle}>
                {agotados.length} ingrediente{agotados.length > 1 ? 's' : ''} agotado{agotados.length > 1 ? 's' : ''}
              </p>
              <p className={styles.alertText}>
                Platos sin poder servirse: {[...platosAfectados]
                  .map((id) => platos.find((p) => p.id === id)?.nombre ?? `#${id}`)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}

        {bajos.length > 0 && (
          <div className={styles.alert} style={{ borderColor: '#fcd34d', background: '#fffbeb' }}>
            <span className={styles.alertIcon}>⚠️</span>
            <div>
              <p className={styles.alertTitle}>
                {bajos.length} ingrediente{bajos.length > 1 ? 's' : ''} con stock bajo
              </p>
              <p className={styles.alertText}>
                Platos en riesgo: {[...platosRiesgo]
                  .filter((id) => !platosAfectados.has(id))
                  .map((id) => platos.find((p) => p.id === id)?.nombre ?? `#${id}`)
                  .join(', ') || '—'}
              </p>
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
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
          <button className={styles.btnNuevo} onClick={openCrear}>+ Nuevo ingrediente</button>
        </div>

        {/* ── Tabla ── */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Compra / Stock</th>
                <th>Gramos disp.</th>
                <th>Porciones est.</th>
                <th>Estado</th>
                <th>Platos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((ing) => {
                const estado    = calcStock(ing, relaciones);
                const cfg       = STOCK_CONFIG[estado];
                const gramos    = gramosTotales(ing);
                const porciones = porcionesEstimadas(ing, relaciones);
                const rels      = relaciones.filter((r) => r.ingredienteId === ing.id);

                return (
                  <tr key={ing.id}>
                    {/* Nombre */}
                    <td>
                      <div className={styles.ingCell}>
                        <span className={styles.nombre}>{ing.nombre}</span>
                        {ing.eliminable && (
                          <span className={styles.eliminableBadge} title="El cliente puede pedirlo quitado">
                            retirable
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Compra / Stock */}
                    <td>
                      <div className={styles.stockMeta}>
                        <span className={styles.stockNum}>{fmtNum(ing.stockUnidades)}</span>
                        <span className={styles.stockUnit}>{ing.unidadCompra}{ing.stockUnidades !== 1 ? 's' : ''}</span>
                        <span className={styles.stockEq}>× {fmtGramos(ing.gramosPorUnidad)}</span>
                      </div>
                    </td>

                    {/* Gramos disponibles */}
                    <td>
                      <span className={styles.gramosDisp}>{fmtGramos(gramos)}</span>
                    </td>

                    {/* Porciones estimadas */}
                    <td>
                      {porciones !== null ? (
                        <div className={styles.porcionesCell}>
                          <span
                            className={styles.porcionesNum}
                            style={{ color: cfg.color }}
                          >
                            {fmtNum(porciones)}
                          </span>
                          <span className={styles.porcionesSub}>porciones</span>
                          {rels.map((r) => {
                            const nombrePlato = platos.find((p) => p.id === r.platoId)?.nombre ?? `#${r.platoId}`;
                            return (
                              <span key={r.platoId} className={styles.porcionesDetalle}>
                                {nombrePlato}: {fmtNum(Math.floor(gramos / r.gramosPorPorcion))}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className={styles.noPlatos}>—</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td>
                      <span
                        className={styles.stockBadge}
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </td>

                    {/* Platos */}
                    <td>
                      <div className={styles.platosTags}>
                        {rels.map((r) => {
                          const nombrePlato = platos.find((p) => p.id === r.platoId)?.nombre ?? `#${r.platoId}`;
                          return (
                            <span
                              key={r.platoId}
                              className={styles.platoTag}
                              style={platosAfectados.has(r.platoId) ? { borderColor: '#fca5a5', color: '#b91c1c' } : {}}
                              title={`Usa ${r.gramosPorPorcion}g/porción`}
                            >
                              {nombrePlato}
                              <span className={styles.gramosTag}>{r.gramosPorPorcion}g</span>
                            </span>
                          );
                        })}
                        {rels.length === 0 && <span className={styles.noPlatos}>Sin asignar</span>}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td>
                      <button className={styles.btnEdit} onClick={() => openEditar(ing)}>✏️ Editar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className={styles.count}>{lista.length} ingredientes</p>
      </div>

      {/* ── Modal crear / editar ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal.mode === 'crear' ? '➕ Nuevo ingrediente' : '✏️ Editar ingrediente'}
            </h3>

            <div className={styles.modalForm}>

              {/* Nombre */}
              <div className={styles.modalField}>
                <label>Nombre del ingrediente</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Fríjoles rojos"
                />
              </div>

              {/* Unidad + Gramos por unidad */}
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Unidad de compra</label>
                  <select
                    className={styles.input}
                    value={form.unidadCompra}
                    onChange={(e) => setForm({ ...form, unidadCompra: e.target.value })}
                  >
                    {UNIDADES_COMPRA.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className={styles.modalField}>
                  <label>Gramos por {form.unidadCompra}</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={form.gramosPorUnidad}
                    onChange={(e) => setForm({ ...form, gramosPorUnidad: e.target.value })}
                    placeholder="50000"
                    min={1}
                  />
                </div>
              </div>

              {/* Stock + Mínimo */}
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Stock actual ({form.unidadCompra}s)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={form.stockUnidades}
                    onChange={(e) => setForm({ ...form, stockUnidades: e.target.value })}
                    placeholder="3"
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Alerta si quedan menos de</label>
                  <div className={styles.inputSuffix}>
                    <input
                      type="number"
                      className={styles.input}
                      value={form.stockMinimoPorciones}
                      onChange={(e) => setForm({ ...form, stockMinimoPorciones: e.target.value })}
                      placeholder="10"
                      min={1}
                    />
                    <span className={styles.suffix}>porciones</span>
                  </div>
                </div>
              </div>

              {/* Eliminable */}
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.eliminable}
                  onChange={(e) => setForm({ ...form, eliminable: e.target.checked })}
                />
                El cliente puede pedir que se lo quiten del plato
              </label>

              {/* ── Conversor ── */}
              {convTotalGramos > 0 && (
                <div className={styles.conversor}>
                  <p className={styles.conversorTitle}>📐 Conversor</p>
                  <div className={styles.conversorFormula}>
                    <span className={styles.conversorVal}>{fmtNum(convStockUnidades)}</span>
                    <span className={styles.conversorOp}>{form.unidadCompra}{convStockUnidades !== 1 ? 's' : ''}</span>
                    <span className={styles.conversorOp}>×</span>
                    <span className={styles.conversorVal}>{fmtGramos(convGramosPorUnidad)}</span>
                    <span className={styles.conversorOp}>=</span>
                    <span className={`${styles.conversorVal} ${styles.conversorTotal}`}>{fmtGramos(convTotalGramos)}</span>
                    <span className={styles.conversorOp}>disponibles</span>
                  </div>
                  {convResultados.length > 0 && (
                    <div className={styles.conversorResultados}>
                      <p className={styles.conversorSubtitle}>Alcance por plato:</p>
                      {convResultados.map((r) => (
                        <div key={r.nombre} className={styles.conversorRow}>
                          <span className={styles.conversorPlato}>{r.nombre}</span>
                          <span className={styles.conversorDots} />
                          <span className={styles.conversorPorciones}>{fmtNum(r.porciones)} porc.</span>
                          <span className={styles.conversorGramos}>(usa {r.gramosPorP}g/plato)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Platos que lo usan ── */}
              <div className={styles.modalField}>
                <label>Platos que usan este ingrediente</label>
                <p className={styles.fieldHint}>Marca los platos y especifica cuántos gramos usa cada porción.</p>
                <div className={styles.platosGramosGrid}>
                  {platos.map((plato) => {
                    const rel = form.relaciones.find((r) => r.platoId === plato.id);
                    if (!rel) return null;
                    return (
                      <div key={plato.id} className={`${styles.platoGramoRow} ${rel.activo ? styles.platoGramoRowActive : ''}`}>
                        <label className={styles.platoGramoCheck}>
                          <input
                            type="checkbox"
                            checked={rel.activo}
                            onChange={() => toggleRelacion(plato.id)}
                          />
                          <span className={styles.platoGramoNombre}>{plato.nombre}</span>
                        </label>
                        {rel.activo && (
                          <div className={styles.gramoField}>
                            <input
                              type="number"
                              className={styles.gramoInput}
                              value={rel.gramos}
                              onChange={(e) => setGramos(plato.id, e.target.value)}
                              placeholder="0"
                              min={1}
                            />
                            <span className={styles.gramoSuffix}>g/porción</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleGuardar}>
                {modal.mode === 'crear' ? 'Crear ingrediente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
