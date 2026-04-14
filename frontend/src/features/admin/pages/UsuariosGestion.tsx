import { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import styles from './UsuariosGestion.module.css';

type Rol = 'admin' | 'cocinero' | 'domiciliario' | 'cliente';

const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  cocinero: 'Cocinero',
  domiciliario: 'Domiciliario',
  cliente: 'Cliente',
};

const ROL_EMOJI: Record<Rol, string> = {
  admin: '⚙️',
  cocinero: '👨‍🍳',
  domiciliario: '🛵',
  cliente: '🛒',
};

const ROL_COLOR: Record<Rol, string> = {
  admin: '#7c3aed',
  cocinero: '#d4500a',
  domiciliario: '#0369a1',
  cliente: '#15803d',
};

const USUARIOS_INIT = [
  { id: '1', nombre: 'Admin Remi', correo: 'admin@remi.com', rol: 'admin' as Rol, activo: true },
  { id: '2', nombre: 'Chef Carlos', correo: 'cocina@remi.com', rol: 'cocinero' as Rol, activo: true },
  { id: '3', nombre: 'Repartidor Juan', correo: 'domicilio@remi.com', rol: 'domiciliario' as Rol, activo: true },
  { id: '4', nombre: 'María López', correo: 'maria@gmail.com', rol: 'cliente' as Rol, activo: true },
  { id: '5', nombre: 'Carlos Ruiz', correo: 'carlos@gmail.com', rol: 'cliente' as Rol, activo: true },
  { id: '6', nombre: 'Pedro Cocina', correo: 'pedro@remi.com', rol: 'cocinero' as Rol, activo: false },
];

const ROLES_FILTRO: (Rol | 'todos')[] = ['todos', 'admin', 'cocinero', 'domiciliario', 'cliente'];

type Modal = { mode: 'crear' } | { mode: 'editar'; id: string } | null;
// El admin crea solo staff — los clientes se registran ellos mismos
const EMPTY_FORM = { nombre: '', correo: '', rol: 'cocinero' as Rol, activo: true };

export function UsuariosGestion() {
  const [usuarios, setUsuarios] = useState(USUARIOS_INIT);
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchRol = filtroRol === 'todos' || u.rol === filtroRol;
    const matchBusq =
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase());
    return matchRol && matchBusq;
  });

  function openCrear() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'crear' });
  }

  function openEditar(u: (typeof USUARIOS_INIT)[0]) {
    setForm({ nombre: u.nombre, correo: u.correo, rol: u.rol, activo: u.activo });
    setModal({ mode: 'editar', id: u.id });
  }

  function handleGuardar() {
    if (!form.nombre.trim() || !form.correo.trim()) return;
    if (modal?.mode === 'crear') {
      setUsuarios((prev) => [...prev, { id: `u-${Date.now()}`, ...form }]);
    } else if (modal?.mode === 'editar') {
      const { id } = modal;
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...form } : u)));
    }
    setModal(null);
  }

  function toggleActivo(id: string) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)));
  }

  const conteoRol = (rol: Rol) => usuarios.filter((u) => u.rol === rol && u.activo).length;

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className={styles.wrapper}>
        {/* Stats rápidas */}
        <div className={styles.statsRow}>
          {(['admin', 'cocinero', 'domiciliario', 'cliente'] as Rol[]).map((rol) => (
            <div key={rol} className={styles.statChip} style={{ borderColor: `${ROL_COLOR[rol]}30`, background: `${ROL_COLOR[rol]}0a` }}>
              <span>{ROL_EMOJI[rol]}</span>
              <span style={{ color: ROL_COLOR[rol], fontWeight: 700 }}>{conteoRol(rol)}</span>
              <span className={styles.statLabel}>{ROL_LABEL[rol]}s</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.leftTools}>
            <input
              type="search"
              className={styles.search}
              placeholder="Buscar por nombre o correo…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className={styles.filtros}>
              {ROLES_FILTRO.map((r) => (
                <button
                  key={r}
                  className={`${styles.filtroChip} ${filtroRol === r ? styles.filtroActive : ''}`}
                  onClick={() => setFiltroRol(r)}
                >
                  {r === 'todos' ? 'Todos' : ROL_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <button className={styles.btnNuevo} onClick={openCrear}>
            + Nuevo usuario
          </button>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className={!u.activo ? styles.rowInactiva : ''}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userAvatar}>{ROL_EMOJI[u.rol]}</span>
                      <span className={styles.userName}>{u.nombre}</span>
                    </div>
                  </td>
                  <td className={styles.correo}>{u.correo}</td>
                  <td>
                    <span
                      className={styles.rolBadge}
                      style={{ background: `${ROL_COLOR[u.rol]}15`, color: ROL_COLOR[u.rol] }}
                    >
                      {ROL_LABEL[u.rol]}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`${styles.toggleBtn} ${u.activo ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => toggleActivo(u.id)}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <button className={styles.btnEdit} onClick={() => openEditar(u)}>
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.count}>{usuariosFiltrados.length} usuarios</p>
      </div>

      {/* ── Modal ── */}
      {modal && (() => {
        // El rol original del usuario siendo editado
        const originalUser = modal.mode === 'editar' ? usuarios.find((u) => u.id === modal.id) : null;
        const isClienteUser = originalUser?.rol === 'cliente';

        return (
          <div className={styles.modalOverlay} onClick={() => setModal(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>
                {modal.mode === 'crear' ? '👤 Nuevo usuario de staff' : '✏️ Editar usuario'}
              </h3>
              <div className={styles.modalForm}>
                <div className={styles.modalField}>
                  <label>Nombre completo</label>
                  <input type="text" className={styles.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
                </div>
                <div className={styles.modalField}>
                  <label>Correo electrónico</label>
                  <input type="email" className={styles.input} value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="usuario@remi.com" />
                </div>
                <div className={styles.modalField}>
                  <label>Rol</label>
                  {isClienteUser ? (
                    <>
                      <select className={styles.input} value="cliente" disabled>
                        <option value="cliente">Cliente</option>
                      </select>
                      <p className={styles.rolNote}>
                        🔒 El rol de clientes no se puede modificar desde el panel admin. Los clientes se registran de forma autónoma.
                      </p>
                    </>
                  ) : (
                    <select className={styles.input} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
                      <option value="admin">Administrador</option>
                      <option value="cocinero">Cocinero</option>
                      <option value="domiciliario">Domiciliario</option>
                    </select>
                  )}
                </div>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                  Usuario activo
                </label>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
                <button className={styles.btnSave} onClick={handleGuardar}>
                  {modal.mode === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AdminLayout>
  );
}
