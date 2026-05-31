import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import { useModalClose } from '@/shared/hooks/useModalClose';
import {
  fetchIngredientes, createIngrediente, updateIngrediente, deleteIngrediente,
  upsertPlatoIngrediente, deletePlatoIngrediente,
  type ApiIngrediente,
} from '../services/admin.service';
import styles from './IngredientesGestion.module.css';

type Stock = 'ok' | 'bajo' | 'agotado';
interface Ingrediente { id:number; nombre:string; unidadCompra:string; gramosPorUnidad:number; stockUnidades:number; stockMinimoPorciones:number; eliminable:boolean; }
interface PlatoIngrediente { platoId:number; ingredienteId:number; gramosPorPorcion:number; }

function gramosTotales(ing: Ingrediente) { return ing.stockUnidades * ing.gramosPorUnidad; }
function porcionesEstimadas(ing: Ingrediente, rels: PlatoIngrediente[]) {
  const r = rels.filter(r => r.ingredienteId === ing.id); if (!r.length) return null;
  const g = gramosTotales(ing); const vals = r.map(x => Math.floor(g / x.gramosPorPorcion));
  return Math.round(vals.reduce((a,b) => a+b,0) / vals.length);
}
function calcStock(ing: Ingrediente, rels: PlatoIngrediente[]): Stock {
  if (ing.stockUnidades === 0) return 'agotado';
  const p = porcionesEstimadas(ing, rels); if (p !== null && p < ing.stockMinimoPorciones) return 'bajo';
  return 'ok';
}
function fmtGramos(g: number) {
  if (g >= 1_000_000) return `${(g/1_000_000).toLocaleString('es-CO',{maximumFractionDigits:1})} t`;
  if (g >= 1_000)     return `${(g/1_000).toLocaleString('es-CO',{maximumFractionDigits:1})} kg`;
  return `${g.toLocaleString('es-CO')} g`;
}
function fmtNum(n: number) { return n.toLocaleString('es-CO'); }

const STOCK_CHIP: Record<Stock, string> = {
  ok: 'adm-chip adm-chip-ok', bajo: 'adm-chip adm-chip-warn', agotado: 'adm-chip adm-chip-bad',
};
const STOCK_LABEL: Record<Stock, string> = { ok: 'OK', bajo: 'Bajo', agotado: 'Crítico' };
const STOCK_COL: Record<Stock, string> = { ok: 'var(--adm-ok)', bajo: 'var(--adm-warn)', agotado: 'var(--adm-bad)' };
const UNIDADES_COMPRA = ['bulto','caja','kg','litro','racimo','paca','unidad'];

function mapApi(a: ApiIngrediente): Ingrediente {
  return { id:a.id, nombre:a.nombre, unidadCompra:a.unidadCompra, gramosPorUnidad:Number(a.gramosPorUnidad),
    stockUnidades:Number(a.stockUnidades), stockMinimoPorciones:a.stockMinimoPorciones, eliminable:a.eliminable };
}
function mapRelaciones(apis: ApiIngrediente[]): PlatoIngrediente[] {
  return apis.flatMap(a => (a.platoIngredientes ?? []).map(pi => ({
    platoId:pi.plato.id, ingredienteId:a.id, gramosPorPorcion:Number(pi.gramosPorPorcion),
  })));
}

type FiltroStock = Stock | 'todos';
type ModalMode = { mode:'crear' } | { mode:'editar'; id:number } | null;
interface FormRelacion { platoId:number; gramos:string; activo:boolean; }
interface FormState { nombre:string; unidadCompra:string; gramosPorUnidad:string; stockUnidades:string; stockMinimoPorciones:string; eliminable:boolean; relaciones:FormRelacion[]; }

function buildEmptyForm(ids: number[]): FormState {
  return { nombre:'', unidadCompra:'kg', gramosPorUnidad:'1000', stockUnidades:'0', stockMinimoPorciones:'10', eliminable:true,
    relaciones: ids.map(id => ({ platoId:id, gramos:'', activo:false })) };
}
function buildEditForm(ing: Ingrediente, rels: PlatoIngrediente[], ids: number[]): FormState {
  return { nombre:ing.nombre, unidadCompra:ing.unidadCompra, gramosPorUnidad:String(ing.gramosPorUnidad),
    stockUnidades:String(ing.stockUnidades), stockMinimoPorciones:String(ing.stockMinimoPorciones), eliminable:ing.eliminable,
    relaciones: ids.map(pid => { const r = rels.find(x => x.platoId === pid && x.ingredienteId === ing.id); return { platoId:pid, gramos:r ? String(r.gramosPorPorcion) : '', activo:!!r }; }) };
}

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
  const [form,         setForm        ] = useState<FormState>(() => buildEmptyForm(platos.map(p => p.id)));

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const d = await fetchIngredientes(); setIngredientes(d.map(mapApi)); setRelaciones(mapRelaciones(d)); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const lista = ingredientes.filter(ing => {
    const e = calcStock(ing, relaciones);
    return (filtro === 'todos' || e === filtro) && ing.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });
  const agotados = ingredientes.filter(i => calcStock(i,relaciones) === 'agotado');
  const bajos    = ingredientes.filter(i => calcStock(i,relaciones) === 'bajo');
  const platosAfectados = new Set(agotados.flatMap(i => relaciones.filter(r => r.ingredienteId === i.id).map(r => r.platoId)));

  function openCrear() { setForm(buildEmptyForm(platos.map(p => p.id))); setErrorMsg(''); setModal({ mode:'crear' }); }
  function openEditar(ing: Ingrediente) { setForm(buildEditForm(ing, relaciones, platos.map(p => p.id))); setErrorMsg(''); setModal({ mode:'editar', id:ing.id }); }

  async function handleGuardar() {
    const gpu = parseFloat(form.gramosPorUnidad), su = parseFloat(form.stockUnidades), smp = parseInt(form.stockMinimoPorciones);
    if (!form.nombre.trim() || isNaN(gpu) || isNaN(su)) return;
    setSaving(true); setErrorMsg('');
    try {
      const body = { nombre:form.nombre, unidadCompra:form.unidadCompra, gramosPorUnidad:gpu, stockUnidades:su, stockMinimoPorciones:isNaN(smp)?10:smp, eliminable:form.eliminable };
      let ingId: number;
      if (modal?.mode === 'crear') { const c = await createIngrediente(body); ingId = c.id; setIngredientes(prev => [...prev, mapApi(c)]); }
      else { ingId = modal!.id; const a = await updateIngrediente(modal!.id, body); setIngredientes(prev => prev.map(i => i.id === modal!.id ? mapApi(a) : i)); }
      const prevRels = relaciones.filter(r => r.ingredienteId === ingId);
      await Promise.all(form.relaciones.map(async rel => {
        const g = parseFloat(rel.gramos); const era = prevRels.some(r => r.platoId === rel.platoId);
        if (rel.activo && g > 0) await upsertPlatoIngrediente(rel.platoId, { ingredienteId:ingId, gramosPorPorcion:g });
        else if (!rel.activo && era) await deletePlatoIngrediente(rel.platoId, ingId);
      }));
      const d = await fetchIngredientes(); setIngredientes(d.map(mapApi)); setRelaciones(mapRelaciones(d));
      setModal(null);
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Error guardando'); }
    finally { setSaving(false); }
  }

  async function handleEliminar(ing: Ingrediente) {
    if (!confirm(`¿Eliminar "${ing.nombre}"?`)) return;
    try { await deleteIngrediente(ing.id); setIngredientes(prev => prev.filter(i => i.id !== ing.id)); setRelaciones(prev => prev.filter(r => r.ingredienteId !== ing.id)); }
    catch (err) { alert(err instanceof Error ? err.message : 'No se pudo eliminar'); }
  }
  function toggleRelacion(pid: number) { setForm(f => ({ ...f, relaciones: f.relaciones.map(r => r.platoId === pid ? { ...r, activo:!r.activo, gramos:r.activo?'':r.gramos } : r) })); }
  function setGramos(pid: number, gramos: string) { setForm(f => ({ ...f, relaciones: f.relaciones.map(r => r.platoId === pid ? { ...r, gramos } : r) })); }

  const { backdropProps: modalBdProps } = useModalClose(() => setModal(null));
  const convG = parseFloat(form.gramosPorUnidad)||0, convS = parseFloat(form.stockUnidades)||0, convT = convS*convG;
  const convRes = form.relaciones.filter(r => r.activo && parseFloat(r.gramos)>0).map(r => {
    const p = platos.find(x => x.id === r.platoId); const g = parseFloat(r.gramos);
    return { nombre:p?.nombre??`Plato ${r.platoId}`, gramosPorP:g, porciones:g>0?Math.floor(convT/g):0 };
  });

  return (
    <AdminLayout title="Ingredientes" subtitle="Control de stock y alertas">
      <div className="adm-view">

        {/* Alertas */}
        {agotados.length > 0 && (
          <div className="adm-alert danger">
            <span className="adm-alert-icon">🚨</span>
            <div>
              <div className="adm-alert-title">{agotados.length} ingrediente{agotados.length>1?'s':''} en estado crítico</div>
              <div className="adm-alert-text">
                Platos sin poder servirse: {[...platosAfectados].map(id => platos.find(p=>p.id===id)?.nombre??`#${id}`).join(', ')}
              </div>
            </div>
          </div>
        )}
        {bajos.length > 0 && (
          <div className="adm-alert warn">
            <span className="adm-alert-icon">⚠️</span>
            <div>
              <div className="adm-alert-title">{bajos.length} ingrediente{bajos.length>1?'s':''} con stock bajo</div>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="adm-cols-3" style={{ marginBottom:22 }}>
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Ingredientes</div>
              <div className="adm-tile sage" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 20c-3.5 0-7-2.5-7-7 3.5 0 7 2.5 7 7Z"/><path d="M11 20c0-6 3-11 9-13-1 7-4 13-9 13Z"/><path d="M14.5 8.5 18 5"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:26 }}>{loading ? '…' : ingredientes.length}</div>
            <div className="adm-kpi-foot"><span className="muted">En inventario</span></div>
          </div>
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Stock crítico</div>
              <div className="adm-tile rose" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.5"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:26 }}>{loading ? '…' : agotados.length}</div>
            <div className="adm-kpi-foot"><span className="muted">Reponer hoy</span></div>
          </div>
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Platos afectados</div>
              <div className="adm-tile peach" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 11a9 9 0 0 1 18 0Z"/><path d="M2 11h20M12 6V3M11 3h2"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:26 }}>{loading ? '…' : platosAfectados.size}</div>
            <div className="adm-kpi-foot"><span className="muted">Por faltantes</span></div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search" style={{ maxWidth:280 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input placeholder="Buscar ingredientes…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          {/* Seg: Todos / Crítico / Bajo — igual al diseño */}
          <div className="adm-seg">
            <button className={filtro==='todos'   ? 'active' : ''} onClick={() => setFiltro('todos')}>Todos</button>
            <button className={filtro==='agotado' ? 'active' : ''} onClick={() => setFiltro('agotado')}>Crítico</button>
            <button className={filtro==='bajo'    ? 'active' : ''} onClick={() => setFiltro('bajo')}>Bajo</button>
          </div>
          <div className="adm-toolbar-spacer" />
          <button className="adm-btn adm-btn-primary" onClick={openCrear}>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo ingrediente
          </button>
        </div>

        {/* Tabla — 6 columnas como el diseño */}
        <div className="adm-table-wrap">
          {loading ? <div className="adm-loading">Cargando ingredientes…</div> : lista.length === 0 ? (
            <div className="adm-empty">No hay ingredientes con ese filtro</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Disponible</th>
                  <th style={{ width: 200 }}>Nivel de stock</th>
                  <th>Estado</th>
                  <th>Uso</th>
                  <th style={{ width: 90 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(ing => {
                  const e    = calcStock(ing, relaciones);
                  const g    = gramosTotales(ing);
                  const p    = porcionesEstimadas(ing, relaciones);
                  const rels = relaciones.filter(r => r.ingredienteId === ing.id);
                  const col  = STOCK_COL[e];

                  // Zona amarilla: 0-45 % · umbral en 50 % · zona verde: 50-100 %
                  const hasRels = rels.length > 0;
                  const barColor = !hasRels ? 'var(--adm-line-2)' : col;
                  const barPct = (() => {
                    if (ing.stockUnidades === 0) return 0;
                    if (p === null) return 50; // sin relaciones, indicador neutral
                    const min = ing.stockMinimoPorciones || 1;
                    if (p < min) return Math.max(2, Math.round((p / min) * 45));
                    return Math.min(100, Math.round(50 + ((p - min) / (min * 4)) * 50));
                  })();

                  return (
                    <tr key={ing.id}>

                      {/* Ingrediente */}
                      <td>
                        <div className={styles.ingCell}>
                          <div className="adm-tile sage" style={{ width:38, height:38, borderRadius:10 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={19} height={19}>
                              <path d="M11 20c-3.5 0-7-2.5-7-7 3.5 0 7 2.5 7 7Z"/>
                              <path d="M11 20c0-6 3-11 9-13-1 7-4 13-9 13Z"/>
                            </svg>
                          </div>
                          <div>
                            <div className={styles.nombre}>{ing.nombre}</div>
                            {ing.eliminable && <span className={styles.eliminableBadge}>retirable</span>}
                          </div>
                        </div>
                      </td>

                      {/* Disponible — gramos totales */}
                      <td>
                        <span className={styles.gramosDisp}>{fmtGramos(g)}</span>
                        <div className="adm-cell-sub">{fmtNum(ing.stockUnidades)} {ing.unidadCompra}{ing.stockUnidades !== 1 ? 's' : ''}</div>
                      </td>

                      {/* Nivel de stock — barra + texto */}
                      <td>
                        <div className="adm-progress" style={{ marginTop: 0 }}>
                          <span style={{ width: `${barPct}%`, background: barColor }} />
                        </div>
                        <div className="adm-cell-sub" style={{ marginTop: 5 }}>
                          {p !== null
                            ? `${fmtNum(p)} porciones · mín. ${fmtNum(ing.stockMinimoPorciones)}`
                            : 'Sin platos configurados'}
                        </div>
                      </td>

                      {/* Estado */}
                      <td>
                        <span className={STOCK_CHIP[e]}>
                          <span className="adm-chip-dot" />
                          {STOCK_LABEL[e]}
                        </span>
                      </td>

                      {/* Uso — número de platos */}
                      <td>
                        <span className="adm-cell-sub">
                          {rels.length} plato{rels.length !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="adm-row-act">
                          <button className="adm-mini-btn" title="Editar" onClick={() => openEditar(ing)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={16} height={16}><path d="M14 5l5 5M4 20l1-4L16 5l3 3L8 19l-4 1Z"/></svg>
                          </button>
                          <button className="adm-mini-btn danger" title="Eliminar" onClick={() => handleEliminar(ing)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={16} height={16}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="adm-count">{lista.length} ingredientes</p>
      </div>

      {/* Modal */}
      {modal && (
        <div className="adm-overlay" {...modalBdProps}>
          <div className="adm-modal-box lg" onClick={e => e.stopPropagation()} style={{ maxHeight:'85vh', overflowY:'auto' }}>
            <div className="adm-modal-title">{modal.mode==='crear'?'Nuevo ingrediente':'Editar ingrediente'}</div>
            <div className="adm-modal-form">
              <div className="adm-modal-field">
                <label>Nombre del ingrediente</label>
                <input type="text" className="adm-input" value={form.nombre}
                  onChange={e => setForm({ ...form, nombre:e.target.value })} placeholder="Ej: Fríjoles rojos" />
              </div>
              <div className="adm-modal-row">
                <div className="adm-modal-field">
                  <label>Unidad de compra</label>
                  <select className="adm-input" value={form.unidadCompra}
                    onChange={e => setForm({ ...form, unidadCompra:e.target.value })}>
                    {UNIDADES_COMPRA.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="adm-modal-field">
                  <label>Gramos por {form.unidadCompra}</label>
                  <input type="number" className="adm-input" value={form.gramosPorUnidad}
                    onChange={e => setForm({ ...form, gramosPorUnidad:e.target.value })} min={1} />
                </div>
              </div>
              <div className="adm-modal-row">
                <div className="adm-modal-field">
                  <label>Stock actual ({form.unidadCompra}s)</label>
                  <input type="number" className="adm-input" value={form.stockUnidades}
                    onChange={e => setForm({ ...form, stockUnidades:e.target.value })} min={0} step={0.5} />
                </div>
                <div className="adm-modal-field">
                  <label>Alerta si quedan menos de</label>
                  <div className={styles.inputSuffix}>
                    <input type="number" className="adm-input" value={form.stockMinimoPorciones}
                      onChange={e => setForm({ ...form, stockMinimoPorciones:e.target.value })} min={1} />
                    <span className={styles.suffix}>porciones</span>
                  </div>
                </div>
              </div>
              <label className="adm-check-label">
                <input type="checkbox" checked={form.eliminable}
                  onChange={e => setForm({ ...form, eliminable:e.target.checked })} />
                El cliente puede pedir que se lo quiten del plato
              </label>
              {convT > 0 && (
                <div className={styles.conversor}>
                  <p className={styles.conversorTitle}>📐 Conversor</p>
                  <div className={styles.conversorFormula}>
                    <span className={styles.conversorVal}>{fmtNum(convS)}</span>
                    <span className={styles.conversorOp}>{form.unidadCompra}(s) ×</span>
                    <span className={styles.conversorVal}>{fmtGramos(convG)}</span>
                    <span className={styles.conversorOp}>=</span>
                    <span className={`${styles.conversorVal} ${styles.conversorTotal}`}>{fmtGramos(convT)}</span>
                    <span className={styles.conversorOp}>disponibles</span>
                  </div>
                  {convRes.length > 0 && (
                    <div className={styles.conversorResultados}>
                      <p className={styles.conversorSubtitle}>Alcance por plato:</p>
                      {convRes.map(r => (
                        <div key={r.nombre} className={styles.conversorRow}>
                          <span className={styles.conversorPlato}>{r.nombre}</span>
                          <span className={styles.conversorDots} />
                          <span className={styles.conversorPorciones}>{fmtNum(r.porciones)} porc.</span>
                          <span className={styles.conversorGramos}>(usa {r.gramosPorP}g)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="adm-modal-field">
                <label>Platos que usan este ingrediente</label>
                <p className={styles.fieldHint}>Marca los platos y especifica cuántos gramos usa cada porción.</p>
                <div className={styles.platosGramosGrid}>
                  {platos.map(plato => {
                    const rel = form.relaciones.find(r => r.platoId === plato.id);
                    if (!rel) return null;
                    return (
                      <div key={plato.id} className={`${styles.platoGramoRow} ${rel.activo ? styles.platoGramoRowActive : ''}`}>
                        <label className={styles.platoGramoCheck}>
                          <input type="checkbox" checked={rel.activo} onChange={() => toggleRelacion(plato.id)} />
                          <span className={styles.platoGramoNombre}>{plato.nombre}</span>
                        </label>
                        {rel.activo && (
                          <div className={styles.gramoField}>
                            <input type="number" className={styles.gramoInput} value={rel.gramos}
                              onChange={e => setGramos(plato.id, e.target.value)} placeholder="0" min={1} />
                            <span className={styles.gramoSuffix}>g/porción</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {errorMsg && <p className="adm-error">{errorMsg}</p>}
            </div>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : modal.mode==='crear' ? 'Crear ingrediente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
