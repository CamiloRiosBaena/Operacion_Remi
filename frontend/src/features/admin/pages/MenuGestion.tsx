import { useRef, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import type { Plato } from '@/features/menu/types/plato.types';
import styles from './MenuGestion.module.css';

const CATEGORIAS = ['Entradas', 'Platos fuertes', 'Bebidas', 'Postres'];

interface FormState {
  nombre: string;
  categoria: string;
  precio: string;
  disponible: boolean;
  imageUrl?: string;      // base64 persistida
  imagePreview?: string;  // misma base64, usada para preview
}

type Modal = { mode: 'crear' } | { mode: 'editar'; plato: Plato } | null;

const EMPTY_FORM: FormState = {
  nombre: '', categoria: 'Entradas', precio: '', disponible: true,
};

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function MenuGestion() {
  const { platos, upsertPlato, deletePlato, toggleDisponible } = usePlatos();
  const [filtro, setFiltro]     = useState('Todos');
  const [modal, setModal]       = useState<Modal>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef            = useRef<HTMLInputElement>(null);

  const platosFiltrados =
    filtro === 'Todos' ? platos : platos.filter((p) => p.categoria === filtro);

  function openCrear() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'crear' });
  }

  function openEditar(plato: Plato) {
    setForm({
      nombre: plato.nombre,
      categoria: plato.categoria,
      precio: String(plato.precio),
      disponible: plato.disponible,
      imageUrl: plato.imageUrl,
      imagePreview: plato.imageUrl,
    });
    setModal({ mode: 'editar', plato });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convertir a base64 para que persista en el estado del componente.
    // TODO: cuando haya backend de uploads, hacer POST aquí y guardar la URL real.
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((prev) => ({ ...prev, imagePreview: base64, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setForm((prev) => ({ ...prev, imagePreview: undefined, imageUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleGuardar() {
    const precio = parseInt(form.precio);
    if (!form.nombre.trim() || isNaN(precio)) return;

    if (modal?.mode === 'editar') {
      // Preservar descripcion, ingredientes y extras del plato existente
      const existing = platos.find((p) => p.id === modal.plato.id);
      upsertPlato({
        ...(existing!),
        nombre: form.nombre,
        categoria: form.categoria,
        precio,
        disponible: form.disponible,
        imageUrl: form.imageUrl,
      });
    } else {
      upsertPlato({
        id: Date.now(),
        nombre: form.nombre,
        categoria: form.categoria,
        precio,
        disponible: form.disponible,
        imageUrl: form.imageUrl,
        descripcion: '',
        ingredientes: [],
        extras: [],
      });
    }
    setModal(null);
  }

  function handleToggleDisponible(id: number) {
    toggleDisponible(id);
  }

  function confirmDelete() {
    if (deleteId !== null) {
      deletePlato(deleteId);
      setDeleteId(null);
    }
  }

  return (
    <AdminLayout title="Gestión de Menú">
      <div className={styles.wrapper}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filtros}>
            {['Todos', ...CATEGORIAS].map((cat) => (
              <button
                key={cat}
                className={`${styles.filtroChip} ${filtro === cat ? styles.filtroActive : ''}`}
                onClick={() => setFiltro(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <button className={styles.btnNuevo} onClick={openCrear}>+ Nuevo plato</button>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
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

              {/* ── Imagen del plato ── */}
              <div className={styles.modalField}>
                <label>Imagen del plato</label>
                <div className={styles.imgUploadArea}>
                  {/* Preview */}
                  <div className={styles.imgPreview}>
                    <PlatoImage
                      nombre={form.nombre || 'Plato'}
                      categoria={form.categoria}
                      imageUrl={form.imagePreview}
                      size="lg"
                    />
                  </div>

                  <div className={styles.imgActions}>
                    <button
                      type="button"
                      className={styles.btnUpload}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {form.imagePreview ? 'Cambiar foto' : 'Subir foto'}
                    </button>

                    {form.imagePreview && (
                      <button type="button" className={styles.btnRemoveImg} onClick={removeImage}>
                        Quitar imagen
                      </button>
                    )}

                    <p className={styles.imgHint}>
                      {form.imagePreview
                        ? 'Si no subes imagen, se mostrará el gradiente de categoría.'
                        : 'JPG o PNG · máx. 2 MB · recomendado 1:1'}
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={styles.fileInputHidden}
                  onChange={handleImageChange}
                />
              </div>

              {/* Nombre */}
              <div className={styles.modalField}>
                <label>Nombre del plato</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Bandeja Paisa"
                />
              </div>

              {/* Categoría + Precio */}
              <div className={styles.modalRow}>
                <div className={styles.modalField}>
                  <label>Categoría</label>
                  <select
                    className={styles.input}
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.modalField}>
                  <label>Precio (COP)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="28000"
                  />
                </div>
              </div>

              {/* Disponible */}
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                />
                Disponible en el menú
              </label>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleGuardar}>
                {modal.mode === 'crear' ? 'Crear plato' : 'Guardar cambios'}
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
