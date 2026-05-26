import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useModalClose } from '@/shared/hooks/useModalClose';
import {
  fetchStaff, fetchClientes,
  createStaff, updateStaff, deleteStaff, updateEstadoCliente,
  type ApiStaff, type ApiCliente, type RolStaff, type EstadoStaff, type EstadoCliente,
} from '../services/admin.service';
import styles from './UsuariosGestion.module.css';

type Rol = RolStaff | 'cliente';

const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador', cocinero: 'Cocinero',
  domiciliario: 'Domiciliario', cliente: 'Cliente',
};
const ROL_EMOJI: Record<Rol, string> = {
  admin: '⚙️', cocinero: '👨‍🍳', domiciliario: '🛵', cliente: '🛒',
};
const ROL_COLOR: Record<Rol, string> = {
  admin: '#7c3aed', cocinero: '#d4500a', domiciliario: '#0369a1', cliente: '#15803d',
};

// Tipo unificado para mostrar en la tabla
interface UsuarioRow {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: string;
  tipo: 'staff' | 'cliente';
  fechaRegistro?: string;
}

const ROLES_FILTRO: (Rol | 'todos')[] = ['todos', 'admin', 'cocinero', 'domiciliario', 'cliente'];
const EMPTY_FORM = { nombre: '', correo: '', contrasena: '', rol: 'cocinero' as RolStaff };

type Modal = { mode: 'crear' } | { mode: 'editar'; usuario: UsuarioRow } | null;

export function UsuariosGestion() {
  const [staffList, setStaffList]     = useState<ApiStaff[]>([]);
  const [clienteList, setClienteList] = useState<ApiCliente[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filtroRol, setFiltroRol]     = useState<Rol | 'todos'>('todos');
  const [busqueda, setBusqueda]       = useState('');
  const [modal, setModal]             = useState<Modal>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([fetchStaff(), fetchClientes()]);
      setStaffList(s);
      setClienteList(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const { backdropProps: modalBdProps } = useModalClose(() => setModal(null));

  // Unificar en filas de tabla
  const usuarios: UsuarioRow[] = [
    ...staffList.map((s): UsuarioRow => ({
      id: `s-${s.id}`, nombre: s.nombre, correo: s.correo,
      rol: s.rol, estado: s.estado, tipo: 'staff',
    })),
    ...clienteList.map((c): UsuarioRow => ({
      id: `c-${c.id}`, nombre: c.nombre, correo: c.correo,
      rol: 'cliente', estado: c.estado, tipo: 'cliente',
      fechaRegistro: c.fechaRegistro,
    })),
  ];

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchRol  = filtroRol === 'todos' || u.rol === filtroRol;
    const matchBusq = u.nombre.toLowerCase().includes(busqueda.toLowerCase())
                   || u.correo.toLowerCase().includes(busqueda.toLowerCase());
    return matchRol && matchBusq;
  });

  const conteoRol = (rol: Rol) => usuarios.filter((u) => u.rol === rol && u.estado === 'activo').length;

  async function handleGuardar() {
    if (!form.nombre.trim() || !form.correo.trim()) return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (modal?.mode === 'crear') {
        if (!form.contrasena || form.contrasena.length < 6) {
          setErrorMsg('La contraseña debe tener al menos 6 caracteres');
          return;
        }
        const nuevo = await createStaff(form);
        setStaffList((prev) => [...prev, nuevo]);
      } else if (modal?.mode === 'editar' && modal.usuario.tipo === 'staff') {
        const staffId = Number(modal.usuario.id.replace('s-', ''));
        const actualizado = await updateStaff(staffId, {
          nombre: form.nombre,
          rol: form.rol,
          ...(form.contrasena ? { contrasena: form.contrasena } : {}),
        });
        setStaffList((prev) => prev.map((s) => (s.id === staffId ? actualizado : s)));
      }
      setModal(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEstado(u: UsuarioRow) {
    try {
      if (u.tipo === 'staff') {
        const staffId = Number(u.id.replace('s-', ''));
        const nuevoEstado: EstadoStaff = u.estado === 'activo' ? 'inactivo' : 'activo';
        const actualizado = await updateStaff(staffId, { estado: nuevoEstado });
        setStaffList((prev) => prev.map((s) => (s.id === staffId ? actualizado : s)));
      } else {
        const clienteId = Number(u.id.replace('c-', ''));
        const nuevoEstado: EstadoCliente = u.estado === 'activo' ? 'inactivo' : 'activo';
        const actualizado = await updateEstadoCliente(clienteId, nuevoEstado);
        setClienteList((prev) => prev.map((c) => (c.id === clienteId ? actualizado : c)));
      }
    } catch (err) { console.error(err); }
  }

  async function handleBanear(u: UsuarioRow) {
    if (u.tipo !== 'cliente') return;
    if (!confirm(`¿Banear a ${u.nombre}? No podrá iniciar sesión.`)) return;
    const clienteId = Number(u.id.replace('c-', ''));
    try {
      const actualizado = await updateEstadoCliente(clienteId, 'baneado');
      setClienteList((prev) => prev.map((c) => (c.id === clienteId ? actualizado : c)));
    } catch (err) { console.error(err); }
  }

  async function handleEliminarStaff(u: UsuarioRow) {
    if (u.tipo !== 'staff') return;
    if (!confirm(`¿Eliminar a ${u.nombre}?`)) return;
    const staffId = Number(u.id.replace('s-', ''));
    try {
      await deleteStaff(staffId);
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
    } catch (err) { console.error(err); }
  }

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className={styles.wrapper}>
        {/* Stats */}
        <div className={styles.statsRow}>
          {(['admin', 'cocinero', 'domiciliario', 'cliente'] as Rol[]).map((rol) => (
            <div key={rol} className={styles.statChip}
              style={{ borderColor: `${ROL_COLOR[rol]}30`, background: `${ROL_COLOR[rol]}0a` }}>
              <span>{ROL_EMOJI[rol]}</span>
              <span style={{ color: ROL_COLOR[rol], fontWeight: 700 }}>
                {loading ? '…' : conteoRol(rol)}
              </span>
              <span className={styles.statLabel}>{ROL_LABEL[rol]}s</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.leftTools}>
            <input type="search" className={styles.search}
              placeholder="Buscar por nombre o correo…"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <div className={styles.filtros}>
              {ROLES_FILTRO.map((r) => (
                <button key={r}
                  className={`${styles.filtroChip} ${filtroRol === r ? styles.filtroActive : ''}`}
                  onClick={() => setFiltroRol(r)}>
                  {r === 'todos' ? 'Todos' : ROL_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <button className={styles.btnNuevo}
            onClick={() => { setForm(EMPTY_FORM); setErrorMsg(''); setModal({ mode: 'crear' }); }}>
            + Nuevo staff
          </button>
        </div>

        {/* Tabla */}
        <div className={styles.tableWrap}>
          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#78716c' }}>Cargando usuarios…</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Usuario</th><th>Correo</th><th>Rol</th>
                  <th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className={u.estado !== 'activo' ? styles.rowInactiva : ''}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.userAvatar}>{ROL_EMOJI[u.rol]}</span>
                        <div>
                          <span className={styles.userName}>{u.nombre}</span>
                          {u.tipo === 'cliente' && (
                            <span className={styles.clienteTag}>cliente</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={styles.correo}>{u.correo}</td>
                    <td>
                      <span className={styles.rolBadge}
                        style={{ background: `${ROL_COLOR[u.rol]}15`, color: ROL_COLOR[u.rol] }}>
                        {ROL_LABEL[u.rol]}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.toggleBtn} ${u.estado === 'activo' ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => handleToggleEstado(u)}
                        disabled={u.estado === 'baneado'}
                      >
                        {u.estado === 'activo' ? 'Activo' : u.estado === 'baneado' ? '🚫 Baneado' : 'Inactivo'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {u.tipo === 'staff' && (
                          <>
                            <button className={styles.btnEdit} onClick={() => {
                              setForm({ nombre: u.nombre, correo: u.correo, contrasena: '', rol: u.rol as RolStaff });
                              setErrorMsg('');
                              setModal({ mode: 'editar', usuario: u });
                            }}>✏️</button>
                            <button className={styles.btnDelete} onClick={() => handleEliminarStaff(u)}>🗑</button>
                          </>
                        )}
                        {u.tipo === 'cliente' && u.estado !== 'baneado' && (
                          <button className={styles.btnBan} onClick={() => handleBanear(u)}>🚫</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className={styles.count}>{usuariosFiltrados.length} usuarios</p>
      </div>

      {/* Modal */}
      {modal && (
        <div className={styles.modalOverlay} {...modalBdProps}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modal.mode === 'crear' ? '👤 Nuevo usuario staff' : '✏️ Editar usuario'}
            </h3>
            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>Nombre completo</label>
                <input type="text" className={styles.input} value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              {modal.mode === 'crear' && (
                <div className={styles.modalField}>
                  <label>Correo electrónico</label>
                  <input type="email" className={styles.input} value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                </div>
              )}
              <div className={styles.modalField}>
                <label>Rol</label>
                <select className={styles.input} value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value as RolStaff })}>
                  <option value="admin">Administrador</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="domiciliario">Domiciliario</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <label>{modal.mode === 'crear' ? 'Contraseña' : 'Nueva contraseña (opcional)'}</label>
                <input type="password" className={styles.input} value={form.contrasena}
                  onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                  placeholder={modal.mode === 'editar' ? 'Dejar vacío para no cambiar' : ''} />
              </div>
              {errorMsg && <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{errorMsg}</p>}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : modal.mode === 'crear' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
