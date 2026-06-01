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
const ROL_LABEL: Record<Rol, string> = { admin:'Administrador', cocinero:'Cocinero', domiciliario:'Domiciliario', cliente:'Cliente' };
const ROL_CHIP: Record<Rol, string> = {
  admin: 'adm-chip adm-chip-bad', cocinero: 'adm-chip adm-chip-warn',
  domiciliario: 'adm-chip adm-chip-info', cliente: 'adm-chip adm-chip-ok',
};
const ROL_TILE: Record<Rol, string> = { admin:'rose', cocinero:'peach', domiciliario:'sky', cliente:'sage' };

interface UsuarioRow { id: string; nombre: string; correo: string; rol: Rol; estado: string; tipo: 'staff'|'cliente'; }
const ROLES_FILTRO: (Rol|'todos')[] = ['todos','admin','cocinero','domiciliario','cliente'];
const EMPTY_FORM = { nombre:'', correo:'', contrasena:'', rol:'cocinero' as RolStaff };
type Modal = { mode:'crear' } | { mode:'editar'; usuario: UsuarioRow } | null;

function getInitials(name: string) { return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }

export function UsuariosGestion() {
  const [staffList,   setStaffList  ] = useState<ApiStaff[]>([]);
  const [clienteList, setClienteList] = useState<ApiCliente[]>([]);
  const [loading,     setLoading    ] = useState(true);
  const [filtroRol,   setFiltroRol  ] = useState<Rol|'todos'>('todos');
  const [busqueda,    setBusqueda   ] = useState('');
  const [modal,       setModal      ] = useState<Modal>(null);
  const [form,        setForm       ] = useState(EMPTY_FORM);
  const [saving,      setSaving     ] = useState(false);
  const [errorMsg,    setErrorMsg   ] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try { const [s,c] = await Promise.all([fetchStaff(), fetchClientes()]); setStaffList(s); setClienteList(c); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const { backdropProps: modalBdProps } = useModalClose(() => setModal(null));

  const usuarios: UsuarioRow[] = [
    ...staffList.map((s): UsuarioRow => ({ id:`s-${s.id}`, nombre:s.nombre, correo:s.correo, rol:s.rol, estado:s.estado, tipo:'staff' })),
    ...clienteList.map((c): UsuarioRow => ({ id:`c-${c.id}`, nombre:c.nombre, correo:c.correo, rol:'cliente', estado:c.estado, tipo:'cliente' })),
  ];
  const filtrados = usuarios.filter(u =>
    (filtroRol === 'todos' || u.rol === filtroRol) &&
    (u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.correo.toLowerCase().includes(busqueda.toLowerCase()))
  );
  const conteoRol = (rol: Rol) => usuarios.filter(u => u.rol === rol && u.estado === 'activo').length;

  async function handleGuardar() {
    if (!form.nombre.trim() || !form.correo.trim()) return;
    setSaving(true); setErrorMsg('');
    try {
      if (modal?.mode === 'crear') {
        if (!form.contrasena || form.contrasena.length < 6) { setErrorMsg('La contraseña debe tener al menos 6 caracteres'); return; }
        const nuevo = await createStaff(form); setStaffList(prev => [...prev, nuevo]);
      } else if (modal?.mode === 'editar' && modal.usuario.tipo === 'staff') {
        const id = Number(modal.usuario.id.replace('s-',''));
        const act = await updateStaff(id, { nombre:form.nombre, rol:form.rol, ...(form.contrasena ? { contrasena:form.contrasena } : {}) });
        setStaffList(prev => prev.map(s => s.id === id ? act : s));
      }
      setModal(null);
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Error guardando'); }
    finally { setSaving(false); }
  }
  async function handleToggleEstado(u: UsuarioRow) {
    try {
      if (u.tipo === 'staff') {
        const id = Number(u.id.replace('s-','')); const ne: EstadoStaff = u.estado === 'activo' ? 'inactivo' : 'activo';
        const act = await updateStaff(id, { estado: ne }); setStaffList(prev => prev.map(s => s.id === id ? act : s));
      } else {
        const id = Number(u.id.replace('c-','')); const ne: EstadoCliente = u.estado === 'activo' ? 'inactivo' : 'activo';
        const act = await updateEstadoCliente(id, ne); setClienteList(prev => prev.map(c => c.id === id ? act : c));
      }
    } catch (err) { console.error(err); }
  }
  async function handleBanear(u: UsuarioRow) {
    if (u.tipo !== 'cliente' || !confirm(`¿Banear a ${u.nombre}?`)) return;
    const id = Number(u.id.replace('c-',''));
    try { const act = await updateEstadoCliente(id, 'baneado'); setClienteList(prev => prev.map(c => c.id === id ? act : c)); }
    catch (err) { console.error(err); }
  }
  async function handleEliminarStaff(u: UsuarioRow) {
    if (u.tipo !== 'staff' || !confirm(`¿Eliminar a ${u.nombre}?`)) return;
    const id = Number(u.id.replace('s-',''));
    try { await deleteStaff(id); setStaffList(prev => prev.filter(s => s.id !== id)); }
    catch (err) { console.error(err); }
  }

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className="adm-view">

        {/* ── Stats ── */}
        <div className="adm-cols-3" style={{ marginBottom:22 }}>
          {/* Usuarios totales */}
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Usuarios</div>
              <div className="adm-tile lilac" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M16.5 14.5a5.5 5.5 0 0 1 4 5.5"/>
                </svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:26 }}>{loading ? '…' : usuarios.length}</div>
            <div className="adm-kpi-foot"><span className="muted">{usuarios.filter(u=>u.estado==='activo').length} activos</span></div>
          </div>
          {/* Roles */}
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Roles</div>
              <div className="adm-tile sage" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
                </svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:26 }}>4</div>
            <div className="adm-kpi-foot"><span className="muted">Admin, cocinero…</span></div>
          </div>
          {/* Staff activo */}
          <div className="adm-kpi" style={{ padding:18 }}>
            <div className="adm-kpi-top" style={{ marginBottom:10 }}>
              <div className="adm-kpi-label">Staff activo</div>
              <div className="adm-tile amber" style={{ width:36, height:36, borderRadius:10 }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9"/><path d="M8 12.5 11 15.5 16 9.5"/>
                </svg>
              </div>
            </div>
            <div className="adm-kpi-value" style={{ fontSize:26 }}>{loading ? '…' : staffList.filter(s=>s.estado==='activo').length}</div>
            <div className="adm-kpi-foot"><span className="muted">En este momento</span></div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="adm-toolbar">
          <div className="adm-search" style={{ maxWidth:300 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
            <input placeholder="Buscar por nombre o correo…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="adm-seg">
            {ROLES_FILTRO.map(r => (
              <button key={r} className={filtroRol === r ? 'active' : ''} onClick={() => setFiltroRol(r)}>
                {r === 'todos' ? 'Todos' : ROL_LABEL[r]}
              </button>
            ))}
          </div>
          <div className="adm-toolbar-spacer" />
          <button className="adm-btn adm-btn-primary"
            onClick={() => { setForm(EMPTY_FORM); setErrorMsg(''); setModal({ mode:'crear' }); }}>
            + Nuevo staff
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className="adm-table-wrap">
          {loading ? <div className="adm-loading">Cargando usuarios…</div> : (
            <table className="adm-table">
              <thead>
                <tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th style={{width:120}}>Acciones</th></tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id} style={u.estado !== 'activo' ? { opacity:0.6 } : undefined}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.userAvatar}>{getInitials(u.nombre)}</div>
                        <div>
                          <div className={styles.userName}>
                            {u.nombre}
                            {u.tipo === 'cliente' && <span className={styles.clienteTag}>cliente</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="adm-cell-sub">{u.correo}</td>
                    <td><span className={ROL_CHIP[u.rol]}>{ROL_LABEL[u.rol]}</span></td>
                    <td>
                      <button className={`adm-toggle ${u.estado === 'activo' ? 'on' : ''}`}
                        onClick={() => handleToggleEstado(u)} disabled={u.estado === 'baneado'} />
                    </td>
                    <td>
                      <div className="adm-row-act">
                        {u.tipo === 'staff' && (
                          <>
                            <button className="adm-mini-btn" title="Editar" onClick={() => {
                              setForm({ nombre:u.nombre, correo:u.correo, contrasena:'', rol:u.rol as RolStaff });
                              setErrorMsg(''); setModal({ mode:'editar', usuario:u });
                            }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 5l5 5M4 20l1-4L16 5l3 3L8 19l-4 1Z"/></svg>
                            </button>
                            <button className="adm-mini-btn danger" title="Eliminar" onClick={() => handleEliminarStaff(u)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
                            </button>
                          </>
                        )}
                        {u.tipo === 'cliente' && u.estado !== 'baneado' && (
                          <button className="adm-mini-btn danger" title="Banear" onClick={() => handleBanear(u)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M4.9 4.9 19.1 19.1"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="adm-count">{filtrados.length} usuarios</p>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="adm-overlay" {...modalBdProps}>
          <div className="adm-modal-box sm" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">
              {modal.mode === 'crear' ? 'Nuevo usuario staff' : 'Editar usuario'}
            </div>
            <div className="adm-modal-form">
              <div className="adm-modal-field">
                <label>Nombre completo</label>
                <input type="text" className="adm-input" value={form.nombre}
                  onChange={e => setForm({ ...form, nombre:e.target.value })} />
              </div>
              {modal.mode === 'crear' && (
                <div className="adm-modal-field">
                  <label>Correo electrónico</label>
                  <input type="email" className="adm-input" value={form.correo}
                    onChange={e => setForm({ ...form, correo:e.target.value })} />
                </div>
              )}
              <div className="adm-modal-field">
                <label>Rol</label>
                <select className="adm-input" value={form.rol}
                  onChange={e => setForm({ ...form, rol:e.target.value as RolStaff })}>
                  <option value="admin">Administrador</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="domiciliario">Domiciliario</option>
                </select>
              </div>
              <div className="adm-modal-field">
                <label>{modal.mode === 'crear' ? 'Contraseña' : 'Nueva contraseña (opcional)'}</label>
                <input type="password" className="adm-input" value={form.contrasena}
                  onChange={e => setForm({ ...form, contrasena:e.target.value })}
                  placeholder={modal.mode === 'editar' ? 'Dejar vacío para no cambiar' : ''} />
              </div>
              {errorMsg && <p className="adm-error">{errorMsg}</p>}
            </div>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando…' : modal.mode === 'crear' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
