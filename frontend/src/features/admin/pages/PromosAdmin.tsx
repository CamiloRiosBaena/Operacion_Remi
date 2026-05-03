import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useModalClose } from '@/shared/hooks/useModalClose';
import {
  fetchAllPromos,
  createPromo,
  updatePromo,
  deletePromo,
  type PromoPayload,
} from '@/features/menu/services/promo.service';
import { fetchCategorias, type ApiCategoria } from '@/features/menu/services/menu.service';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import { uploadPlatoImage } from '@/shared/lib/storage';
import type { Promo } from '@/features/menu/types/promo.types';
import styles from './PromosAdmin.module.css';

// ── Formulario vacío por defecto ─────────────────────────────────────────────
const EMPTY: PromoPayload = {
  tag: '',
  titulo: '',
  subtitulo: '',
  cta: 'Ver más',
  ctaAccion: 'plato',
  ctaValor: '',
  colorFrom: '#1c1917',
  colorTo: '#292524',
  colorAcento: '#d4500a',
  activo: true,
  orden: 0,
  imageUrl: null,
};

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

// ── Componente ───────────────────────────────────────────────────────────────
export function PromosAdmin() {
  const [promos, setPromos]             = useState<Promo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState<'crear' | Promo | null>(null);
  const [form, setForm]                 = useState<PromoPayload>(EMPTY);
  const [saving, setSaving]             = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [deleteError, setDeleteError]   = useState('');
  const [categorias, setCategorias]     = useState<ApiCategoria[]>([]);
  const [imgPreview, setImgPreview]     = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const { platos } = usePlatos();

  const { backdropProps: formBdProps }   = useModalClose(() => closeModal());
  const { backdropProps: deleteBdProps } = useModalClose(() => { setDeleteId(null); setDeleteError(''); });

  useEffect(() => {
    load();
    fetchCategorias().then(setCategorias).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try { setPromos(await fetchAllPromos()); }
    catch { /* sin promos */ }
    finally { setLoading(false); }
  }

  function openCrear() {
    setForm({ ...EMPTY, orden: promos.length });
    setImgPreview(null);
    setErrorMsg('');
    setModal('crear');
  }

  function openEditar(promo: Promo) {
    const { id: _id, ...rest } = promo;
    setForm(rest as PromoPayload);
    setImgPreview(promo.imageUrl ?? null);
    setErrorMsg('');
    setModal(promo);
  }

  function closeModal() {
    setModal(null);
    setErrorMsg('');
    setImgPreview(null);
  }

  function setField<K extends keyof PromoPayload>(key: K, value: PromoPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    setErrorMsg('');
    try {
      const url = await uploadPlatoImage(file);
      setField('imageUrl', url);
      setImgPreview(url);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al subir imagen');
    } finally {
      setImgUploading(false);
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemoveImage() {
    setField('imageUrl', null);
    setImgPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    if (!form.tag.trim() || !form.titulo.trim() || !form.ctaValor.trim()) {
      setErrorMsg('Completa tag, título y destino del botón.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      if (modal === 'crear') {
        const nueva = await createPromo(form);
        setPromos((prev) => [...prev, nueva].sort((a, b) => a.orden - b.orden));
      } else {
        const actualizada = await updatePromo((modal as Promo).id, form);
        setPromos((prev) => prev.map((p) => (p.id === actualizada.id ? actualizada : p)));
      }
      closeModal();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActivo(promo: Promo) {
    try {
      const updated = await updatePromo(promo.id, { activo: !promo.activo });
      setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch { /* silencioso */ }
  }

  async function handleOrden(promo: Promo, direction: 'up' | 'down') {
    const sorted = [...promos].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((p) => p.id === promo.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const other = sorted[targetIdx];
    const [newOrden, otherOrden] = [other.orden, promo.orden];

    try {
      const [a, b] = await Promise.all([
        updatePromo(promo.id, { orden: newOrden }),
        updatePromo(other.id, { orden: otherOrden }),
      ]);
      setPromos((prev) =>
        prev.map((p) => (p.id === a.id ? a : p.id === b.id ? b : p))
           .sort((x, y) => x.orden - y.orden),
      );
    } catch { /* silencioso */ }
  }

  async function confirmDelete() {
    if (deleteId === null) return;
    setDeleteError('');
    try {
      await deletePromo(deleteId);
      setPromos((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      setDeleteError(err.message ?? 'No se pudo eliminar');
    }
  }

  const sortedPromos = [...promos].sort((a, b) => a.orden - b.orden);

  return (
    <AdminLayout title="Banners Promocionales">
      <div className={styles.wrapper}>
        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <button className={styles.btnAdd} onClick={openCrear}>
            + Nueva promo
          </button>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <p className={styles.empty}>Cargando…</p>
        ) : sortedPromos.length === 0 ? (
          <p className={styles.empty}>No hay promos. Crea la primera.</p>
        ) : (
          <div className={styles.grid}>
            {sortedPromos.map((promo, idx) => (
              <div key={promo.id} className={styles.card}>
                {/* Preview de colores */}
                <div
                  className={styles.cardPreview}
                  style={{ background: `linear-gradient(135deg, ${promo.colorFrom}, ${promo.colorTo})` }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      className={styles.cardTag}
                      style={{ color: promo.colorAcento, borderColor: `${promo.colorAcento}55` }}
                    >
                      {promo.tag}
                    </span>
                    <p className={styles.cardTitle}>{promo.titulo}</p>
                    <p className={styles.cardSub}>{promo.subtitulo}</p>
                  </div>
                  {promo.imageUrl && (
                    <img src={promo.imageUrl} alt="" className={styles.cardThumb} />
                  )}
                  {!promo.activo && <span className={styles.inactiveBadge}>Inactiva</span>}
                </div>

                {/* Acciones */}
                <div className={styles.cardBody}>
                  <div className={styles.cardMeta}>
                    <span>
                      {promo.ctaAccion === 'plato'
                        ? `Plato: ${platos.find((p) => p.id === Number(promo.ctaValor))?.nombre ?? `ID ${promo.ctaValor}`}`
                        : `Categoría: ${promo.ctaValor}`}
                    </span>
                    <span>Botón: "{promo.cta}" · Orden: {promo.orden}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {/* Reorden */}
                    <div className={styles.ordenBtns}>
                      <button
                        className={styles.btnOrden}
                        onClick={() => handleOrden(promo, 'up')}
                        disabled={idx === 0}
                        title="Subir"
                      >▲</button>
                      <button
                        className={styles.btnOrden}
                        onClick={() => handleOrden(promo, 'down')}
                        disabled={idx === sortedPromos.length - 1}
                        title="Bajar"
                      >▼</button>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.btnIcon} ${promo.activo ? styles.btnIconActive : ''}`}
                        onClick={() => handleToggleActivo(promo)}
                        title={promo.activo ? 'Desactivar' : 'Activar'}
                      >
                        {promo.activo ? '👁️' : '🙈'}
                      </button>
                      <button
                        className={styles.btnIcon}
                        onClick={() => openEditar(promo)}
                        title="Editar"
                      >✏️</button>
                      <button
                        className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                        onClick={() => { setDeleteId(promo.id); setDeleteError(''); }}
                        title="Eliminar"
                      >🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal crear / editar ── */}
      {modal !== null && (
        <div className={styles.overlay} {...formBdProps}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              {modal === 'crear' ? '✨ Nueva promo' : '✏️ Editar promo'}
            </h3>

            {/* Preview live */}
            <div
              className={styles.preview}
              style={{ background: `linear-gradient(135deg, ${form.colorFrom}, ${form.colorTo})` }}
            >
              {imgPreview && (
                <img src={imgPreview} alt="" className={styles.previewImg} />
              )}
              <div>
                <span
                  className={styles.previewTag}
                  style={{ color: form.colorAcento, borderColor: `${form.colorAcento}55` }}
                >
                  {form.tag || 'Tag'}
                </span>
                <p className={styles.previewTitle}>{form.titulo || 'Título'}</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              {/* Tag */}
              <div className={`${styles.field} ${styles.formFull}`}>
                <label className={styles.label}>Tag (emoji + texto)</label>
                <input className={styles.input} placeholder="🔥 Oferta del día" value={form.tag} onChange={(e) => setField('tag', e.target.value)} />
              </div>

              {/* Título */}
              <div className={`${styles.field} ${styles.formFull}`}>
                <label className={styles.label}>Título</label>
                <input className={styles.input} placeholder="Bandeja Paisa" value={form.titulo} onChange={(e) => setField('titulo', e.target.value)} />
              </div>

              {/* Subtítulo */}
              <div className={`${styles.field} ${styles.formFull}`}>
                <label className={styles.label}>Subtítulo</label>
                <textarea className={styles.textarea} placeholder="Descripción corta de la promo" value={form.subtitulo} onChange={(e) => setField('subtitulo', e.target.value)} />
              </div>

              {/* CTA texto */}
              <div className={styles.field}>
                <label className={styles.label}>Texto del botón</label>
                <input className={styles.input} placeholder="Pedir ahora" value={form.cta} onChange={(e) => setField('cta', e.target.value)} />
              </div>

              {/* Orden */}
              <div className={styles.field}>
                <label className={styles.label}>Orden</label>
                <input type="number" min={0} className={styles.input} value={form.orden} onChange={(e) => setField('orden', Number(e.target.value))} />
              </div>

              {/* Acción */}
              <div className={styles.field}>
                <label className={styles.label}>Destino del botón</label>
                <select
                  className={styles.select}
                  value={form.ctaAccion}
                  onChange={(e) => { setField('ctaAccion', e.target.value as 'plato' | 'categoria'); setField('ctaValor', ''); }}
                >
                  <option value="plato">Plato específico</option>
                  <option value="categoria">Categoría del menú</option>
                </select>
              </div>

              {/* Valor del CTA */}
              <div className={styles.field}>
                <label className={styles.label}>
                  {form.ctaAccion === 'plato' ? 'Plato' : 'Categoría'}
                </label>
                {form.ctaAccion === 'plato' ? (
                  <select
                    className={styles.select}
                    value={form.ctaValor}
                    onChange={(e) => setField('ctaValor', e.target.value)}
                  >
                    <option value="">-- Selecciona --</option>
                    {platos.filter((p) => p.disponible).map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    className={styles.select}
                    value={form.ctaValor}
                    onChange={(e) => setField('ctaValor', e.target.value)}
                  >
                    <option value="">-- Selecciona --</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* ── Colores ── */}
              <div className={`${styles.field} ${styles.formFull}`}>
                <label className={styles.label}>Colores del gradiente y acento</label>
                <div className={styles.colorStack}>
                  {(['colorFrom', 'colorTo', 'colorAcento'] as const).map((key) => (
                    <div key={key} className={styles.colorStackRow}>
                      <span className={styles.colorStackLabel}>
                        {key === 'colorFrom' ? 'Inicio' : key === 'colorTo' ? 'Fin' : 'Acento'}
                      </span>
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={form[key]}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                      <input
                        className={styles.colorHex}
                        value={form[key]}
                        maxLength={7}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setField(key, v);
                        }}
                      />
                      {/* Muestra el color como pastilla */}
                      <span
                        className={styles.colorDot}
                        style={{ background: form[key] }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Imagen del banner ── */}
              <div className={`${styles.field} ${styles.formFull}`}>
                <label className={styles.label}>Imagen del banner (opcional)</label>
                <div className={styles.imgUploadArea}>
                  {imgPreview ? (
                    <div className={styles.imgPreviewWrap}>
                      <img src={imgPreview} alt="preview" className={styles.imgPreview} />
                      <button
                        type="button"
                        className={styles.imgRemoveBtn}
                        onClick={handleRemoveImage}
                        title="Quitar imagen"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.imgPickBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imgUploading}
                    >
                      {imgUploading ? 'Subiendo…' : '📷 Subir imagen'}
                    </button>
                  )}
                  {!imgPreview && (
                    <p className={styles.imgHint}>
                      Se mostrará al lado derecho del banner. Recomendado: imagen del plato en PNG/WebP.
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
              </div>

              {/* Activo */}
              <div className={`${styles.field} ${styles.formFull}`}>
                <div className={styles.toggleRow}>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setField('activo', e.target.checked)}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                  <span style={{ fontSize: '0.85rem', color: '#44403c' }}>
                    {form.activo ? 'Activa — visible en el menú' : 'Inactiva — oculta en el menú'}
                  </span>
                </div>
              </div>
            </div>

            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={closeModal}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving || imgUploading}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ── */}
      {deleteId !== null && (
        <div className={styles.overlay} {...deleteBdProps}>
          <div className={styles.modal} style={{ maxWidth: 380 }}>
            <h3 className={styles.modalTitle}>🗑️ Eliminar promo</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#44403c' }}>
              ¿Seguro que quieres eliminar <strong>"{sortedPromos.find((p) => p.id === deleteId)?.titulo}"</strong>?
            </p>
            {deleteError && <p className={styles.errorMsg}>{deleteError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => { setDeleteId(null); setDeleteError(''); }}>Cancelar</button>
              <button className={styles.btnSave} style={{ background: '#dc2626' }} onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
