import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { PlatoImage } from '@/shared/components/PlatoImage';
import styles from './MenuGestion.module.css';

const CATEGORIAS = ['Entradas', 'Platos fuertes', 'Bebidas', 'Postres'];

const PLATOS_INIT = [
  { id: 1, nombre: 'Bandeja Paisa', categoria: 'Platos fuertes', precio: 28000, disponible: true, emoji: '🫘' },
  { id: 2, nombre: 'Ajiaco Bogotano', categoria: 'Platos fuertes', precio: 22000, disponible: true, emoji: '🍲' },
  { id: 3, nombre: 'Empanadas (x3)', categoria: 'Entradas', precio: 9000, disponible: true, emoji: '🥟' },
  { id: 4, nombre: 'Jugo de Lulo', categoria: 'Bebidas', precio: 5000, disponible: true, emoji: '🥤' },
  { id: 5, nombre: 'Sancocho de Gallina', categoria: 'Platos fuertes', precio: 25000, disponible: false, emoji: '🍗' },
  { id: 6, nombre: 'Patacones con Hogao', categoria: 'Entradas', precio: 8000, disponible: true, emoji: '🍌' },
  { id: 7, nombre: 'Agua Panela con Limón', categoria: 'Bebidas', precio: 3500, disponible: true, emoji: '🍋' },
  { id: 8, nombre: 'Arroz con Leche', categoria: 'Postres', precio: 6000, disponible: true, emoji: '🍚' },
];

type Plato = typeof PLATOS_INIT[0];
type Modal = { mode: 'crear' } | { mode: 'editar'; plato: Plato } | null;

const EMPTY_FORM = { nombre: '', categoria: 'Entradas', precio: '', disponible: true, emoji: '🍽️' };

function formatPrecio(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export function MenuGestion() {
  const [platos, setPlatos] = useState(PLATOS_INIT);
  const [filtro, setFiltro] = useState('Todos');
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const platosFiltrados =
    filtro === 'Todos' ? platos : platos.filter((p) => p.categoria === filtro);

  function openCrear() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'crear' });
  }

  function openEditar(plato: Plato) {
    setForm({ ...plato, precio: String(plato.precio) });
    setModal({ mode: 'editar', plato });
  }

  function handleGuardar() {
    const precio = parseInt(form.precio as string);
    if (!form.nombre.trim() || isNaN(precio)) return;

    if (modal?.mode === 'crear') {
      setPlatos((prev) => [
        ...prev,
        { id: Date.now(), nombre: form.nombre, categoria: form.categoria, precio, disponible: form.disponible, emoji: form.emoji },
      ]);
    } else if (modal?.mode === 'editar') {
      setPlatos((prev) =>
        prev.map((p) =>
          p.id === modal.plato.id
            ? { ...p, nombre: form.nombre, categoria: form.categoria, precio, disponible: form.disponible, emoji: form.emoji }
            : p,
        ),
      );
    }
    setModal(null);
  }

  function handleToggleDisponible(id: number) {
    setPlatos((prev) => prev.map((p) => (p.id === id ? { ...p, disponible: !p.disponible } : p)));
  }

  function confirmDelete() {
    if (deleteId !== null) {
      setPlatos((prev) => prev.filter((p) => p.id !== deleteId));
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
          <button className={styles.btnNuevo} onClick={openCrear}>
            + Nuevo plato
          </button>
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
                      <PlatoImage nombre={plato.nombre} categoria={plato.categoria} size="sm" />
                      <span className={styles.platoNombre}>{plato.nombre}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.catBadge}>{plato.categoria}</span>
                  </td>
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
                      <button className={styles.btnEdit} onClick={() => openEditar(plato)}>
                        ✏️ Editar
                      </button>
                      <button className={styles.btnDelete} onClick={() => setDeleteId(plato.id)}>
                        🗑
                      </button>
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
              <div className={styles.modalField}>
                <label>Emoji</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  maxLength={4}
                />
              </div>
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

      {/* ── Modal confirmar eliminación ── */}
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
