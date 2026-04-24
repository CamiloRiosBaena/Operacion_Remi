import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import { fetchCategorias, createCategoria, type ApiCategoria } from '@/features/menu/services/menu.service';
import { uploadPlatoImage } from '@/shared/lib/storage';
import type { Plato } from '@/features/menu/types/plato.types';
import styles from './MenuGestion.module.css';

interface FormState {
  nombre: string;
  categoriaId: number;
  precio: string;
  disponible: boolean;
  imageUrl?: string;
  imagePreview?: string;
}

type Modal = { mode: 'crear' } | { mode: 'editar'; plato: Plato } | null;
type CatModal = { open: true } | null;

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function MenuGestion() {
  const { platos, loading, upsertPlato, deletePlato, toggleDisponible } = usePlatos();
  const [categorias, setCategorias]   = useState<ApiCategoria[]>([]);
  const [filtro, setFiltro]           = useState(0); // 0 = Todos
  const [modal, setModal]             = useState<Modal>(null);
  const [form, setForm]               = useState<FormState>({ nombre: '', categoriaId: 0, precio: '', disponible: true });
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [saving, setSaving]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // ── Modal nueva categoría ────────────────────────────────────
  const [catModal, setCatModal]       = useState<CatModal>(null);
  const [catNombreInput, setCatNombreInput] = useState('');
  const [catSaving, setCatSaving]     = useState(false);
  const [catError, setCatError]       = useState('');

  // Cargar categorías del backend
  useEffect(() => {
    fetchCategorias().then(setCategorias).catch(console.error);
  }, []);

  // Cuando ya tenemos categorías, el form por defecto usa la primera
  useEffect(() => {
    if (categorias.length && form.categoriaId === 0) {
      setForm((f) => ({ ...f, categoriaId: categorias[0].id }));
    }
  }, [categorias, form.categoriaId]);

  const platosFiltrados =
    filtro === 0
      ? platos
      : platos.filter((p) => p.categoriaId === filtro);

  function openCrear() {
    setForm({ nombre: '', categoriaId: categorias[0]?.id ?? 0, precio: '', disponible: true });
    setErrorMsg('');
    setModal({ mode: 'crear' });
  }

  function openEditar(plato: Plato) {
    setForm({
      nombre: plato.nombre,
      categoriaId: plato.categoriaId ?? categorias[0]?.id ?? 0,
      precio: String(plato.precio),
      disponible: plato.disponible,
      imageUrl: plato.imageUrl,
      imagePreview: plato.imageUrl,
    });
    setErrorMsg('');
    setModal({ mode: 'editar', plato });
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar preview local inmediatamente
    const localUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, imagePreview: localUrl }));

    // Subir a Supabase Storage
    setUploadingImg(true);
    setErrorMsg('');
    try {
      const publicUrl = await uploadPlatoImage(file);
      setForm((prev) => ({ ...prev, imageUrl: publicUrl, imagePreview: publicUrl }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir la imagen');
      setForm((prev) => ({ ...prev, imagePreview: undefined, imageUrl: undefined }));
    } finally {
      setUploadingImg(false);
    }
  }

  function removeImage() {
    setForm((prev) => ({ ...prev, imagePreview: undefined, imageUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleGuardar() {
    const precio = parseInt(form.precio);
    if (!form.nombre.trim() || isNaN(precio) || !form.categoriaId) return;

    const catNombre = categorias.find((c) => c.id === form.categoriaId)?.nombre ?? '';
    setSaving(true);
    setErrorMsg('');
    try {
      if (modal?.mode === 'editar') {
        const existing = platos.find((p) => p.id === modal.plato.id)!;
        await upsertPlato({
          ...existing,
          nombre: form.nombre,
          categoria: catNombre,
          categoriaId: form.categoriaId,
          precio,
          disponible: form.disponible,
          imageUrl: form.imageUrl,
        });
      } else {
        await upsertPlato({
          id: 0,
          nombre: form.nombre,
          categoria: catNombre,
          categoriaId: form.categoriaId,
          precio,
          disponible: form.disponible,
          imageUrl: form.imageUrl,
          descripcion: '',
          ingredientes: [],
          extras: [],
        });
      }
      setModal(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  async function handleCrearCategoria() {
    if (!catNombreInput.trim()) return;
    setCatSaving(true);
    setCatError('');
    try {
      const nueva = await createCategoria(catNombreInput.trim());
      setCategorias((prev) => [...prev, nueva]);
      setForm((f) => ({ ...f, categoriaId: nueva.id }));
      setCatModal(null);
      setCatNombreInput('');
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error al crear categoría');
    } finally {
      setCatSaving(false);
    }
  }

  async function handleToggleDisponible(id: number) {
    try { await toggleDisponible(id); }
    catch (err) { console.error(err); }
  }

  async function confirmDelete() {
    if (deleteId === null) return;
    try {
      await deletePlato(deleteId);
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AdminLayout title="Gestión de Menú">
      <div className={styles.wrapper}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filtros}>
            <button
              className={`${styles.filtroChip} ${filtro === 0 ? styles.filtroActive : ''}`}
              onClick={() => setFiltro(0)}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.filtroChip} ${filtro === cat.id ? styles.filtroActive : ''}`}
                onClick={() => setFiltro(cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={styles.btnNuevo} style={{ background: '#64748b' }}
              onClick={() => { setCatModal({ open: true }); setCatNombreInput(''); setCatError(''); }}>
              + Nueva categoría
            </button>
            <button className={styles.btnNuevo} onClick={openCrear}>+ Nuevo plato</button>
          </div>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#78716c' }}>Cargando platos…</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plato</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Disponible</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {platosFiltrados.map((plato) => (
                  <tr key={plato.id} className={!plato.disponible ? styles.rowInactiva : ''}>
                    <td>
                      <div className={styles.platoCell}>
                        <PlatoImage
                          nombre={plato.nombre}
                          categoria={plato.categoria}
                          imageUrl={plato.imageUrl}
                          size="sm"
                        />
                        <span className={styles.platoNombre}>{plato.nombre}</span>
                      </div>
                    </td>
                    <td><span className={styles.catBadge}>{plato.categoria}</span></td>
                    <td className={styles.precio}>{formatPrecio(plato.precio)}</td>
                    <td>
                      <button
                        className={`${styles.toggleBtn} ${plato.disponible ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => handleToggleDisponible(plato.id)}
                      >
                        {plato.disponible ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => openEditar(plato)}>✏️ Editar</button>
                        <button className={styles.btnDelete} onClick={() => setDeleteId(plato.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className={styles.count}>{platosFiltrados.length} platos</p>
      </div>

      {/* ── Modal crear / editar ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal.mode === 'crear' ? '➕ Nuevo plato' : '✏️ Editar plato'}
            </h3>

            <div className={styles.modalForm}>
              {/* Imagen */}
              <div className={styles.modalField}>
                <label>Imagen del plato</label>
                <div className={styles.imgUploadArea}>
                  <div className={styles.imgPreview}>
                    <PlatoImage
                      nombre={form.nombre || 'Plato'}
                      categoria={categorias.find((c) => c.id === form.categoriaId)?.nombre ?? ''}
                      imageUrl={form.imagePreview}
                      size="lg"
                    />
                  </div>
                  <div className={styles.imgActions}>
                    <button type="button" className={styles.btnUpload}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}>
                      {uploadingImg ? '⏳ Subiendo…' : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          {form.imagePreview ? 'Cambiar foto' : 'Subir foto'}
                        </>
                      )}
                    </button>
                    {form.imagePreview && (
                      <button type="button" className={styles.btnRemoveImg} onClick={removeImage}>Quitar imagen</button>
                    )}
                    <p className={styles.imgHint}>JPG o PNG · máx. 2 MB · recomendado 1:1</p>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  className={styles.fileInputHidden} onChange={handleImageChange} />
              </div>

              {/* Nombre */}
              <div className={styles.modalField}>
                <label>Nombre del plato</label>
                <input type="text" className={styles.input} value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Bandeja Paisa" />
              </div>

              {/* Categoría + Precio */}
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Categoría</label>
                  <select className={styles.input} value={form.categoriaId}
                    onChange={(e) => setForm({ ...form, categoriaId: Number(e.target.value) })}>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.modalField}>
                  <label>Precio (COP)</label>
                  <input type="number" className={styles.input} value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="28000" />
                </div>
              </div>

              {/* Disponible */}
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })} />
                Disponible en el menú
              </label>

              {errorMsg && <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{errorMsg}</p>}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : modal.mode === 'crear' ? 'Crear plato' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nueva categoría ── */}
      {catModal && (
        <div className={styles.modalOverlay} onClick={() => setCatModal(null)}>
          <div className={`${styles.modal} ${styles.modalSmall}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>🏷️ Nueva categoría</h3>
            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>Nombre de la categoría</label>
                <input
                  type="text"
                  className={styles.input}
                  value={catNombreInput}
                  onChange={(e) => setCatNombreInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCrearCategoria()}
                  placeholder="Ej: Platos fuertes"
                  autoFocus
                  maxLength={50}
                />
              </div>
              {catError && <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{catError}</p>}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setCatModal(null)} disabled={catSaving}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleCrearCategoria} disabled={catSaving || !catNombreInput.trim()}>
                {catSaving ? 'Creando…' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ── */}
      {deleteId !== null && (
        <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
          <div className={`${styles.modal} ${styles.modalSmall}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>🗑️ Eliminar plato</h3>
            <p className={styles.modalText}>
              ¿Seguro que quieres eliminar <strong>{platos.find((p) => p.id === deleteId)?.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className={`${styles.btnSave} ${styles.btnDanger}`} onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
