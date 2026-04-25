import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import {
  fetchIngredientes, createIngrediente, updateIngrediente, deleteIngrediente,
  upsertPlatoIngrediente, deletePlatoIngrediente,
  type ApiIngrediente,
} from '../services/admin.service';
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

// ── Mapper API → local ───────────────────────────────────────────────────────

function mapApi(a: ApiIngrediente): Ingrediente {
  return {
    id:                  a.id,
    nombre:              a.nombre,
    unidadCompra:        a.unidadCompra,
    gramosPorUnidad:     Number(a.gramosPorUnidad),
    stockUnidades:       Number(a.stockUnidades),
    stockMinimoPorciones: a.stockMinimoPorciones,
    eliminable:          a.eliminable,
  };
}

function mapRelaciones(apis: ApiIngrediente[]): PlatoIngrediente[] {
  return apis.flatMap((a) =>
    (a.platoIngredientes ?? []).map((pi) => ({
      platoId:         pi.plato.id,
      ingredienteId:   a.id,
      gramosPorPorcion: Number(pi.gramosPorPorcion),
    }))
  );
}

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

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [relaciones,   setRelaciones  ] = useState<PlatoIngrediente[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [saving,       setSaving      ] = useState(false);
  const [errorMsg,     setErrorMsg    ] = useState('');
  const [filtro,       setFiltro      ] = useState<FiltroStock>('todos');
  const [busqueda,     setBusqueda    ] = useState('');
  const [modal,        setModal       ] = useState<ModalMode>(null);
  const [form,         setForm        ] = useState<FormState>(() => buildEmptyForm(platos.map((p) => p.id)));

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchIngredientes();
      setIngredientes(data.map(mapApi));
      setRelaciones(mapRelaciones(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

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
    setErrorMsg('');
    setModal({ mode: 'crear' });
  }

  function openEditar(ing: Ingrediente) {
    setForm(buildEditForm(ing, relaciones, platos.map((p) => p.id)));
    setErrorMsg('');
    setModal({ mode: 'editar', id: ing.id });
  }

  async function handleGuardar() {
    const gramosPorUnidad      = parseFloat(form.gramosPorUnidad);
    const stockUnidades        = parseFloat(form.stockUnidades);
    const stockMinimoPorciones = parseInt(form.stockMinimoPorciones);
    if (!form.nombre.trim() || isNaN(gramosPorUnidad) || isNaN(stockUnidades)) return;

    setSaving(true);
    setErrorMsg('');
    try {
      const body = {
        nombre: form.nombre,
        unidadCompra: form.unidadCompra,
        gramosPorUnidad,
        stockUnidades,
        stockMinimoPorciones: isNaN(stockMinimoPorciones) ? 10 : stockMinimoPorciones,
        eliminable: form.eliminable,
      };

      let ingredienteId: number;

      if (modal?.mode === 'crear') {
        const creado = await createIngrediente(body);
        ingredienteId = creado.id;
        setIngredientes((prev) => [...prev, mapApi(creado)]);
      } else {
        ingredienteId = modal!.id;
        const actualizado = await updateIngrediente(modal!.id, body);
        setIngredientes((prev) => prev.map((i) => (i.id === modal!.id ? mapApi(actualizado) : i)));
      }

      // Sincronizar relaciones plato-ingrediente
      const prevRels = relaciones.filter((r) => r.ingredienteId === ingredienteId);
      const ops = form.relaciones.map(async (rel) => {
        const gramos = parseFloat(rel.gramos);
        const eraActivo = prevRels.some((r) => r.platoId === rel.platoId);
        if (rel.activo && gramos > 0) {
          await upsertPlatoIngrediente(rel.platoId, { ingredienteId, gramosPorPorcion: gramos });
        } else if (!rel.activo && eraActivo) {
          await deletePlatoIngrediente(rel.platoId, ingredienteId);
        }
      });
      await Promise.all(ops);

      // Recargar ingredientes para reflejar relaciones actualizadas
      const data = await fetchIngredientes();
      setIngredientes(data.map(mapApi));
      setRelaciones(mapRelaciones(data));

      setModal(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(ing: Ingrediente) {
    if (!confirm(`¿Eliminar "${ing.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteIngrediente(ing.id);
      setIngredientes((prev) => prev.filter((i) => i.id !== ing.id));
      setRelaciones((prev) => prev.filter((r) => r.ingredienteId !== ing.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
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
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#78716c' }}>Cargando ingredientes…</p>
          ) : (
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
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className={styles.btnEdit} onClick={() => openEditar(ing)}>✏️ Editar</button>
                        <button
                          className={styles.btnEdit}
                          style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                          onClick={() => handleEliminar(ing)}
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
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

            {errorMsg && (
              <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 0.25rem' }}>{errorMsg}</p>
            )}
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : modal.mode === 'crear' ? 'Crear ingrediente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
