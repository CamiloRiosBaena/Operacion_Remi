import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useModalClose } from '@/shared/hooks/useModalClose';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import {
  fetchCategorias, createCategoria, fetchExtras, createExtra, deleteExtra,
  type ApiCategoria,
} from '@/features/menu/services/menu.service';
import { uploadPlatoImage } from '@/shared/lib/storage';
import type { Plato, PlatoExtra } from '@/features/menu/types/plato.types';
import styles from './MenuGestion.module.css';

interface FormState {
  nombre: string; categoriaId: number; precio: string;
  tasaIva: string; disponible: boolean; imageUrl?: string; imagePreview?: string;
}

type Modal = { mode: 'crear' } | { mode: 'editar'; plato: Plato } | null;
type CatModal = { open: true } | null;
type FiltroDisp = 'todos' | 'activos' | 'agotados';

function formatPrecio(n: number) { return `$${n.toLocaleString('es-CO')}`; }

// ── Icon helper ──
const PATHS: Record<string, string> = {
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  eye:    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.5"/>',
  edit:   '<path d="M14 5l5 5M4 20l1-4L16 5l3 3L8 19l-4 1Z"/>',
  trash:  '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
};
function Icon({ name, size = 17 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[name] ?? '' }} />
  );
}

export function MenuGestion() {
  const { platos, loading, upsertPlato, deletePlato, toggleDisponible } = usePlatos();
  const [categorias, setCategorias]   = useState<ApiCategoria[]>([]);
  const [filtroDisp, setFiltroDisp]   = useState<FiltroDisp>('todos');
  const [filtroCat, setFiltroCat]     = useState(0); // 0 = todas las categorías
  const [busqueda, setBusqueda]       = useState('');
  const [showCatFilter, setShowCatFilter] = useState(false);
  const [modal, setModal]             = useState<Modal>(null);
  const [form, setForm]               = useState<FormState>({ nombre: '', categoriaId: 0, precio: '', tasaIva: '19', disponible: true });
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [saving, setSaving]           = useState(false);
  const { backdropProps: formBdProps }   = useModalClose(() => setModal(null));
  const { backdropProps: catBdProps }    = useModalClose(() => setCatModal(null));
  const { backdropProps: deleteBdProps } = useModalClose(() => { setDeleteId(null); setDeleteError(''); });
  const [errorMsg, setErrorMsg]       = useState('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [extras, setExtras]           = useState<PlatoExtra[]>([]);
  const [extraNombre, setExtraNombre] = useState('');
  const [extraPrecio, setExtraPrecio] = useState('');
  const [savingExtra, setSavingExtra] = useState(false);
  const [catModal, setCatModal]       = useState<CatModal>(null);
  const [catNombreInput, setCatNombreInput] = useState('');
  const [catSaving, setCatSaving]     = useState(false);
  const [catError, setCatError]       = useState('');

  useEffect(() => { fetchCategorias().then(setCategorias).catch(console.error); }, []);
  useEffect(() => {
    if (categorias.length && form.categoriaId === 0)
      setForm((f) => ({ ...f, categoriaId: categorias[0].id }));
  }, [categorias, form.categoriaId]);

  // ── Filtrado combinado ──
  const platosFiltrados = platos.filter(p => {
    const matchDisp =
      filtroDisp === 'todos'    ? true :
      filtroDisp === 'activos'  ? p.disponible :
      !p.disponible;
    const matchCat  = filtroCat === 0 || p.categoriaId === filtroCat;
    const matchBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return matchDisp && matchCat && matchBusq;
  });

  // ── Stats ──
  const precioPromedio = platos.length
    ? Math.round(platos.reduce((s, p) => s + p.precio, 0) / platos.length)
    : 0;

  // ── Handlers (todos idénticos a antes) ──
  function openCrear() {
    setForm({ nombre: '', categoriaId: categorias[0]?.id ?? 0, precio: '', tasaIva: '19', disponible: true });
    setErrorMsg(''); setModal({ mode: 'crear' });
  }
  function openEditar(plato: Plato) {
    setForm({ nombre: plato.nombre, categoriaId: plato.categoriaId ?? categorias[0]?.id ?? 0,
      precio: String(plato.precio), tasaIva: String(Math.round(plato.tasaIva * 100)),
      disponible: plato.disponible, imageUrl: plato.imageUrl, imagePreview: plato.imageUrl });
    setExtras(plato.extras ?? []); setExtraNombre(''); setExtraPrecio(''); setErrorMsg('');
    setModal({ mode: 'editar', plato });
    fetchExtras(plato.id).then(setExtras).catch(console.error);
  }
  async function handleAgregarExtra() {
    if (!extraNombre.trim() || !extraPrecio || modal?.mode !== 'editar') return;
    const precio = parseInt(extraPrecio);
    if (isNaN(precio) || precio < 0) return;
    setSavingExtra(true);
    try {
      const nuevo = await createExtra({ nombre: extraNombre.trim(), precio, platoId: modal.plato.id });
      setExtras(prev => [...prev, nuevo]); setExtraNombre(''); setExtraPrecio('');
    } catch (err) { console.error(err); } finally { setSavingExtra(false); }
  }
  async function handleEliminarExtra(id: number) {
    try { await deleteExtra(id); setExtras(prev => prev.filter(e => e.id !== id)); }
    catch (err) { console.error(err); }
  }
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setForm(prev => ({ ...prev, imagePreview: URL.createObjectURL(file) }));
    setUploadingImg(true); setErrorMsg('');
    try {
      const publicUrl = await uploadPlatoImage(file);
      setForm(prev => ({ ...prev, imageUrl: publicUrl, imagePreview: publicUrl }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir la imagen');
      setForm(prev => ({ ...prev, imagePreview: undefined, imageUrl: undefined }));
    } finally { setUploadingImg(false); }
  }
  function removeImage() {
    setForm(prev => ({ ...prev, imagePreview: undefined, imageUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
  async function handleGuardar() {
    const precio = parseInt(form.precio); const tasaIva = parseFloat(form.tasaIva) / 100;
    if (!form.nombre.trim() || isNaN(precio) || !form.categoriaId || isNaN(tasaIva)) return;
    const catNombre = categorias.find(c => c.id === form.categoriaId)?.nombre ?? '';
    setSaving(true); setErrorMsg('');
    try {
      if (modal?.mode === 'editar') {
        const existing = platos.find(p => p.id === modal.plato.id)!;
        await upsertPlato({ ...existing, nombre: form.nombre, categoria: catNombre,
          categoriaId: form.categoriaId, precio, tasaIva, disponible: form.disponible, imageUrl: form.imageUrl });
      } else {
        await upsertPlato({ id: 0, nombre: form.nombre, categoria: catNombre, categoriaId: form.categoriaId,
          precio, tasaIva, disponible: form.disponible, imageUrl: form.imageUrl, descripcion: '', ingredientes: [], extras: [] });
      }
      setModal(null);
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Error guardando'); }
    finally { setSaving(false); }
  }
  async function handleCrearCategoria() {
    if (!catNombreInput.trim()) return; setCatSaving(true); setCatError('');
    try {
      const nueva = await createCategoria(catNombreInput.trim());
      setCategorias(prev => [...prev, nueva]); setForm(f => ({ ...f, categoriaId: nueva.id }));
      setCatModal(null); setCatNombreInput('');
    } catch (err) { setCatError(err instanceof Error ? err.message : 'Error al crear categoría'); }
    finally { setCatSaving(false); }
  }
  async function handleToggleDisponible(id: number) {
    try { await toggleDisponible(id); } catch (err) { console.error(err); }
  }
  async function confirmDelete() {
    if (deleteId === null) return; setDeleteError('');
    try { await deletePlato(deleteId); setDeleteId(null); }
    catch (err: any) { setDeleteError(err.message ?? 'No se pudo eliminar el plato'); }
  }

  const catNombreSeleccionada = categorias.find(c => c.id === form.categoriaId)?.nombre ?? '';

  return (
    <AdminLayout title="Gestión de Menú" subtitle="Crear, editar y eliminar platos">
      <div className="adm-view">

        {/* ── KPIs ── */}
        <div className="adm-cols-3" style={{ marginBottom: 22 }}>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Platos totales</div>
              <div className="adm-tile peach" style={{ width: 36, height: 36, borderRadius: 10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 3v8M5 3v3a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4 0 0 0 0M17 12v9"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize: 27 }}>{platos.length}</div>
            <div className="adm-kpi-foot">
              <span className="muted">{platos.filter(p => p.disponible).length} activos · {platos.filter(p => !p.disponible).length} agotados</span>
            </div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Categorías</div>
              <div className="adm-tile sage" style={{ width: 36, height: 36, borderRadius: 10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize: 27 }}>{categorias.length}</div>
            <div className="adm-kpi-foot">
              <span className="muted">{categorias.map(c => c.nombre).slice(0, 3).join(', ')}{categorias.length > 3 ? '…' : ''}</span>
            </div>
          </div>
          <div className="adm-kpi" style={{ padding: 18 }}>
            <div className="adm-kpi-top" style={{ marginBottom: 10 }}>
              <div className="adm-kpi-label">Precio promedio</div>
              <div className="adm-tile amber" style={{ width: 36, height: 36, borderRadius: 10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v6M18 9v6"/></svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize: 27 }}>{formatPrecio(precioPromedio)}</div>
            <div className="adm-kpi-foot"><span className="muted">Por plato del menú</span></div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="adm-toolbar" style={{ alignItems: 'center' }}>
          <div className="adm-search" style={{ maxWidth: 280 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input placeholder="Buscar platos…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>

          {/* Seg: Todos / Activos / Agotados */}
          <div className="adm-seg">
            <button className={filtroDisp === 'todos'   ? 'active' : ''} onClick={() => setFiltroDisp('todos')}>Todos</button>
            <button className={filtroDisp === 'activos' ? 'active' : ''} onClick={() => setFiltroDisp('activos')}>Activos</button>
            <button className={filtroDisp === 'agotados'? 'active' : ''} onClick={() => setFiltroDisp('agotados')}>Agotados</button>
          </div>

          <div className="adm-toolbar-spacer" />

          {/* Filtro por categoría */}
          <div className={styles.catFilterWrap}>
            <button
              className={`adm-btn adm-btn-ghost ${showCatFilter ? styles.catFilterBtnActive : ''}`}
              onClick={() => setShowCatFilter(v => !v)}
            >
              <Icon name="filter" size={16} />
              Filtros
              {filtroCat !== 0 && <span className={styles.filterDot} />}
            </button>
            {showCatFilter && (
              <div className={styles.catDropdown}>
                <div className={styles.catDropdownTitle}>Filtrar por categoría</div>
                <div className={styles.catChips}>
                  <button className={`${styles.catChip} ${filtroCat === 0 ? styles.catChipActive : ''}`}
                    onClick={() => { setFiltroCat(0); setShowCatFilter(false); }}>Todas</button>
                  {categorias.map(cat => (
                    <button key={cat.id} className={`${styles.catChip} ${filtroCat === cat.id ? styles.catChipActive : ''}`}
                      onClick={() => { setFiltroCat(cat.id); setShowCatFilter(false); }}>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
                <div className={styles.catDropdownActions}>
                  <button className="adm-btn adm-btn-ghost"
                    style={{ fontSize: 12.5, padding: '6px 12px' }}
                    onClick={() => { setCatModal({ open: true }); setCatNombreInput(''); setCatError(''); setShowCatFilter(false); }}>
                    + Nueva categoría
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="adm-btn adm-btn-primary" onClick={openCrear}>
            <Icon name="plus" size={17} /> Nuevo plato
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className="adm-table-wrap">
          {loading ? (
            <div className="adm-loading">Cargando platos…</div>
          ) : platosFiltrados.length === 0 ? (
            <div className="adm-empty">No hay platos con ese filtro</div>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Plato</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Activo</th>
                  <th style={{ width: 120 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {platosFiltrados.map(plato => (
                  <tr key={plato.id}>
                    <td>
                      <div className={styles.platoCell}>
                        <PlatoImage nombre={plato.nombre} categoria={plato.categoria}
                          imageUrl={plato.imageUrl} size="sm" />
                        <div>
                          <div className={styles.platoNombre}>{plato.nombre}</div>
                          <div className="adm-cell-sub">{plato.categoria}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="adm-chip adm-chip-neutral">{plato.categoria}</span>
                    </td>
                    <td className="adm-cell-strong">${plato.precio.toLocaleString('es-CO')}</td>
                    <td>
                      {plato.disponible
                        ? <span className="adm-chip adm-chip-ok"><span className="adm-chip-dot" />Disponible</span>
                        : <span className="adm-chip adm-chip-bad"><span className="adm-chip-dot" />Agotado</span>
                      }
                    </td>
                    <td>
                      <button className={`adm-toggle ${plato.disponible ? 'on' : ''}`}
                        onClick={() => handleToggleDisponible(plato.id)} />
                    </td>
                    <td>
                      <div className="adm-row-act">
                        <button className="adm-mini-btn" title="Editar" onClick={() => openEditar(plato)}>
                          <Icon name="edit" size={15} />
                        </button>
                        <button className="adm-mini-btn danger" title="Eliminar" onClick={() => setDeleteId(plato.id)}>
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="adm-count">{platosFiltrados.length} platos</p>
      </div>

      {/* ── Modal crear/editar ── */}
      {modal && (
        <div className="adm-overlay" {...formBdProps}>
          <div className="adm-modal-box lg" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">
              {modal.mode === 'crear' ? 'Nuevo plato' : 'Editar plato'}
            </div>
            <div className="adm-modal-form">
              <div className="adm-modal-field">
                <label>Imagen del plato</label>
                <div className={styles.imgUploadArea}>
                  <div className={styles.imgPreview}>
                    <PlatoImage nombre={form.nombre || 'Plato'}
                      categoria={catNombreSeleccionada} imageUrl={form.imagePreview} size="lg" />
                  </div>
                  <div className={styles.imgActions}>
                    <button type="button" className={styles.btnUpload}
                      onClick={() => fileInputRef.current?.click()} disabled={uploadingImg}>
                      {uploadingImg ? 'Subiendo…' : form.imagePreview ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    {form.imagePreview && (
                      <button type="button" className={styles.btnRemoveImg} onClick={removeImage}>Quitar imagen</button>
                    )}
                    <p className={styles.imgHint}>JPG o PNG · máx. 2 MB</p>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className={styles.fileInputHidden} onChange={handleImageChange} />
              </div>

              <div className="adm-modal-field">
                <label>Nombre del plato</label>
                <input type="text" className="adm-input" value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Bandeja Paisa" />
              </div>

              <div className="adm-modal-row">
                <div className="adm-modal-field">
                  <label>Categoría</label>
                  <select className="adm-input" value={form.categoriaId}
                    onChange={e => setForm({ ...form, categoriaId: Number(e.target.value) })}>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="adm-modal-field">
                  <label>Precio (COP)</label>
                  <input type="number" className="adm-input" value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="28000" />
                </div>
              </div>

              <div className="adm-modal-row">
                <div className="adm-modal-field">
                  <label>IVA (%)</label>
                  <select className="adm-input" value={form.tasaIva}
                    onChange={e => setForm({ ...form, tasaIva: e.target.value })}>
                    <option value="0">0% — Excluido</option>
                    <option value="5">5%</option>
                    <option value="19">19% — General</option>
                  </select>
                </div>
                {form.precio && !isNaN(parseInt(form.precio)) && (
                  <div className="adm-modal-field">
                    <label>Precio final al cliente</label>
                    <input className="adm-input" readOnly
                      value={`$${Math.round(parseInt(form.precio)*(1+parseFloat(form.tasaIva)/100)).toLocaleString('es-CO')}`} />
                  </div>
                )}
              </div>

              <label className="adm-check-label">
                <input type="checkbox" checked={form.disponible}
                  onChange={e => setForm({ ...form, disponible: e.target.checked })} />
                Disponible en el menú
              </label>

              {modal?.mode === 'editar' && (
                <div className="adm-modal-field">
                  <label>Extras del plato</label>
                  <p className={styles.fieldHint}>Opciones adicionales que el cliente puede agregar</p>
                  {extras.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {extras.map(e => (
                        <div key={e.id} className={styles.extraItem}>
                          <span>{e.nombre}</span>
                          <span className={styles.extraPrecio}>${e.precio.toLocaleString('es-CO')}</span>
                          <button className={styles.extraDel} onClick={() => e.id && handleEliminarExtra(e.id)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.addExtraRow}>
                    <input type="text" className="adm-input" placeholder="Nombre del extra"
                      value={extraNombre} onChange={e => setExtraNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAgregarExtra()} style={{ flex: 2 }} />
                    <input type="number" className="adm-input" placeholder="Precio"
                      value={extraPrecio} onChange={e => setExtraPrecio(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAgregarExtra()} style={{ flex: 1 }} min={0} />
                    <button className="adm-btn adm-btn-ghost" onClick={handleAgregarExtra}
                      disabled={savingExtra || !extraNombre.trim() || !extraPrecio}>
                      {savingExtra ? '…' : '+ Agregar'}
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && <p className="adm-error">{errorMsg}</p>}
            </div>

            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : modal.mode === 'crear' ? 'Crear plato' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva categoría ── */}
      {catModal && (
        <div className="adm-overlay" {...catBdProps}>
          <div className="adm-modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Nueva categoría</div>
            <div className="adm-modal-form">
              <div className="adm-modal-field">
                <label>Nombre de la categoría</label>
                <input type="text" className="adm-input" value={catNombreInput}
                  onChange={e => setCatNombreInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCrearCategoria()}
                  placeholder="Ej: Platos fuertes" autoFocus maxLength={50} />
              </div>
              {catError && <p className="adm-error">{catError}</p>}
            </div>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setCatModal(null)} disabled={catSaving}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleCrearCategoria}
                disabled={catSaving || !catNombreInput.trim()}>
                {catSaving ? 'Creando…' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ── */}
      {deleteId !== null && (
        <div className="adm-overlay" {...deleteBdProps}>
          <div className="adm-modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Eliminar plato</div>
            <p className="adm-modal-text">
              ¿Seguro que quieres eliminar <strong>{platos.find(p => p.id === deleteId)?.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="adm-error" style={{ marginBottom: 16 }}>{deleteError}</p>}
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => { setDeleteId(null); setDeleteError(''); }}>Cancelar</button>
              <button className="adm-btn" style={{ background: 'var(--adm-bad)', color: '#fff' }} onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
