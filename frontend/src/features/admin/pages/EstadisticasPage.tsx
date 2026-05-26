import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import { fetchPedidos, type ApiPedido } from '../services/admin.service';
import {
  RANGOS_EXPORT,
  calcExportData,
  exportarExcel,
  exportarPDF,
} from '../utils/estadisticasExport';
import styles from './EstadisticasPage.module.css';

// ── SVG area chart helpers ─────────────────────────────────────────────────
const W = 700;
const H = 160;
const PAD_X = 10;
const PAD_Y = 16;

function buildPaths(values: number[]) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    x: PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + (1 - v / max) * (H - PAD_Y * 2),
  }));

  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cpx = (pts[i].x + pts[i + 1].x) / 2;
    line += ` C ${cpx.toFixed(1)} ${pts[i].y.toFixed(1)}, ${cpx.toFixed(1)} ${pts[i + 1].y.toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;
  return { pts, line, area };
}

// ── Donut chart helpers ────────────────────────────────────────────────────
const R = 54;
const CIRC = 2 * Math.PI * R;

function buildDonut(segments: { label: string; porcentaje: number; color: string }[]) {
  let offset = 0;
  const GAP = 3;
  const usable = CIRC - GAP * segments.length;
  return segments.map((s) => {
    const dash = (s.porcentaje / 100) * usable;
    const seg = { ...s, dash, offset };
    offset += dash + GAP;
    return seg;
  });
}

// ── Month helpers ──────────────────────────────────────────────────────────

const MONTHS_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function getDaysOfMonth(offset: number): Date[] {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1));
}

function getMonthLabel(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function formatPrecio(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

const KPI_ACCENT = ['#d4500a', '#7c3aed', '#0284c7', '#ca8a04'];

const TIPO_META: Record<string, { label: string; color: string }> = {
  mesa:      { label: 'Mesa',      color: '#15803d' },
  domicilio: { label: 'Domicilio', color: '#1d4ed8' },
  llevar:    { label: 'Llevar',    color: '#c2410c' },
};

// ── Componente ─────────────────────────────────────────────────────────────

export function EstadisticasPage() {
  const [pedidos,       setPedidos      ] = useState<ApiPedido[]>([]);
  const [loading,       setLoading      ] = useState(true);
  const [monthOffset,   setMonthOffset  ] = useState(0);
  const [exportOpen,    setExportOpen   ] = useState(false);
  const [exportRango,   setExportRango  ] = useState(1);
  const [exportando,    setExportando   ] = useState(false);
  const exportWrapRef = useRef<HTMLDivElement>(null);
  const { platos } = usePlatos();

  const platoMeta = useMemo(() => {
    const map = new Map<string, { imageUrl?: string; categoria: string }>();
    for (const p of platos) map.set(p.nombre, { imageUrl: p.imageUrl, categoria: p.categoria });
    return map;
  }, [platos]);

  useEffect(() => {
    fetchPedidos()
      .then(setPedidos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Cierra el panel al hacer clic fuera
  useEffect(() => {
    if (!exportOpen) return;
    function onOutside(e: MouseEvent) {
      if (exportWrapRef.current && !exportWrapRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [exportOpen]);

  function handleExportar(formato: 'excel' | 'pdf') {
    setExportando(true);
    try {
      const data = calcExportData(pedidos, monthOffset, exportRango);
      if (formato === 'excel') exportarExcel(data, exportRango);
      else exportarPDF(data, exportRango);
    } finally {
      setExportando(false);
      setExportOpen(false);
    }
  }

  const daysInMonth = useMemo(() => getDaysOfMonth(monthOffset), [monthOffset]);
  const monthLabel  = getMonthLabel(monthOffset);

  // ── Ventas por día del mes ─────────────────────────────────────────────
  const ventasMes = useMemo(() => daysInMonth.map((day) => {
    const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const del_dia = pedidos.filter((p) => {
      const f = new Date(p.fechaHora);
      return f >= day && f < nextDay && p.estado !== 'cancelado';
    });
    return {
      dia:     String(day.getDate()),
      ventas:  del_dia.reduce((s, p) => s + Number(p.total), 0),
      pedidos: del_dia.length,
    };
  }), [daysInMonth, pedidos]);

  const totalMes       = ventasMes.reduce((s, d) => s + d.ventas,  0);
  const totalPedidos   = ventasMes.reduce((s, d) => s + d.pedidos, 0);
  const ticketPromedio = totalPedidos > 0 ? Math.round(totalMes / totalPedidos) : 0;
  const mejorDia       = ventasMes.length > 0
    ? ventasMes.reduce((best, d) => d.ventas > best.ventas ? d : best, ventasMes[0])
    : null;

  const KPIS = [
    { label: 'Ventas del mes',  value: formatPrecio(totalMes),                      meta: `${monthLabel} (sin cancelados)`, icon: '💰' },
    { label: 'Pedidos totales', value: String(totalPedidos),                         meta: monthLabel,                       icon: '📦' },
    { label: 'Ticket promedio', value: `$${ticketPromedio.toLocaleString('es-CO')}`, meta: 'Por pedido',                     icon: '🧾' },
    { label: 'Mejor día',       value: mejorDia ? `Día ${mejorDia.dia}` : '—',       meta: mejorDia ? `${mejorDia.pedidos} pedidos — ${formatPrecio(mejorDia.ventas)}` : '', icon: '🏆' },
  ];

  // ── Pedidos del mes (base para top platos y tipos) ─────────────────────
  const pedidosMes = useMemo(() => {
    if (!daysInMonth.length) return [];
    const first     = daysInMonth[0];
    const last      = daysInMonth[daysInMonth.length - 1];
    const afterLast = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    return pedidos.filter((p) => {
      const f = new Date(p.fechaHora);
      return f >= first && f < afterLast && p.estado !== 'cancelado';
    });
  }, [daysInMonth, pedidos]);

  // ── Top platos del mes ─────────────────────────────────────────────────
  const platoCount = new Map<string, { pedidos: number; categoria: string }>();
  for (const p of pedidosMes) {
    for (const d of (p.detalles ?? [])) {
      const key  = d.plato.nombre;
      const prev = platoCount.get(key) ?? { pedidos: 0, categoria: '' };
      platoCount.set(key, { pedidos: prev.pedidos + d.cantidad, categoria: prev.categoria });
    }
  }
  const platosTop = [...platoCount.entries()]
    .sort((a, b) => b[1].pedidos - a[1].pedidos)
    .slice(0, 5)
    .map(([nombre, info]) => ({ nombre, ...info }));
  const maxPlato = platosTop[0]?.pedidos ?? 1;

  // ── Tipos de pedido ────────────────────────────────────────────────────
  const totalTipos = pedidosMes.length || 1;
  const tipoData = ['mesa', 'domicilio', 'llevar'].map((tipo) => {
    const count = pedidosMes.filter((p) => p.tipo === tipo).length;
    return {
      label:      TIPO_META[tipo].label,
      color:      TIPO_META[tipo].color,
      porcentaje: Math.round((count / totalTipos) * 100),
      count,
    };
  }).filter((t) => t.count > 0);

  const donutSegs = buildDonut(tipoData);

  const chartData  = buildPaths(ventasMes.map((d) => d.ventas));
  const maxVenta   = Math.max(...ventasMes.map((d) => d.ventas), 1);
  const showDots   = ventasMes.length <= 10;

  // X-axis: muestra día 1, cada 7 días y el último día
  const xAxisItems = ventasMes.filter((_, i) =>
    i === 0 || i === ventasMes.length - 1 || (i + 1) % 7 === 0
  );

  return (
    <AdminLayout title="Estadísticas">
      <div className={styles.wrapper}>

        {/* ── Sub-header ── */}
        <div className={styles.subHeader}>
          <div className={styles.monthNav}>
            <button
              className={styles.navBtn}
              onClick={() => setMonthOffset((o) => Math.max(o - 1, -24))}
              disabled={monthOffset <= -24}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button
              className={styles.navBtn}
              onClick={() => setMonthOffset((o) => o + 1)}
              disabled={monthOffset >= 0}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className={styles.subHeaderRight}>

            {/* ── Exportar ── */}
            <div className={styles.exportWrap} ref={exportWrapRef}>
              <button
                className={`${styles.exportBtn} ${exportOpen ? styles.exportBtnActive : ''}`}
                onClick={() => setExportOpen((o) => !o)}
                disabled={loading}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar
              </button>

              {exportOpen && (
                <div className={styles.exportPanel}>
                  <p className={styles.exportPanelTitle}>Exportar reporte</p>

                  <div>
                    <p className={styles.exportSectionLabel}>Período</p>
                    <div className={styles.exportRanges}>
                      {RANGOS_EXPORT.map((r) => (
                        <button
                          key={r.numMeses}
                          className={`${styles.exportRangeBtn} ${exportRango === r.numMeses ? styles.exportRangeBtnActive : ''}`}
                          onClick={() => setExportRango(r.numMeses)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <p className={styles.exportNote}>
                      Hasta {monthLabel}
                    </p>
                  </div>

                  <div className={styles.exportActions}>
                    <button
                      className={styles.exportExcelBtn}
                      onClick={() => handleExportar('excel')}
                      disabled={exportando}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="3" y1="15" x2="21" y2="15" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                      {exportando ? '…' : 'Excel'}
                    </button>
                    <button
                      className={styles.exportPdfBtn}
                      onClick={() => handleExportar('pdf')}
                      disabled={exportando}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="8" y1="13" x2="16" y2="13" />
                        <line x1="8" y1="17" x2="16" y2="17" />
                      </svg>
                      {exportando ? '…' : 'PDF'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link to="/menu" className={styles.clientLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Ver menú
            </Link>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className={styles.kpiGrid}>
          {KPIS.map((k, i) => (
            <div key={k.label} className={styles.kpiCard} style={{ '--accent': KPI_ACCENT[i] } as React.CSSProperties}>
              <div className={styles.kpiIcon}>{k.icon}</div>
              <p className={styles.kpiLabel}>{k.label}</p>
              <p className={styles.kpiValue}>{loading ? '…' : k.value}</p>
              <p className={styles.kpiMeta}>{k.meta}</p>
            </div>
          ))}
        </div>

        {/* ── Area chart — ventas por día ── */}
        <div className={styles.areaCard}>
          <div className={styles.areaHeader}>
            <div>
              <h3 className={styles.areaTitle}>Ventas por día</h3>
              <p className={styles.areaSub}>{monthLabel} · en pesos colombianos</p>
            </div>
            <span className={styles.areaBadge}>{formatPrecio(totalMes)} total</span>
          </div>

          <div className={styles.svgWrap}>
            {/* Y-axis grid lines */}
            <div className={styles.yGrid}>
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <div key={f} className={styles.yLine} style={{ bottom: `${f * 100}%` }}>
                  <span className={styles.yLabel}>{formatPrecio(maxVenta * f)}</span>
                </div>
              ))}
            </div>

            <div className={styles.chartArea}>
              {!loading && chartData ? (
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  className={styles.areaSvg}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#d4500a" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#d4500a" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={chartData.area} fill="url(#areaGrad)" />
                  <path d={chartData.line} fill="none" stroke="#d4500a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.areaSvg} aria-hidden="true">
                  <line x1={PAD_X} y1={H / 2} x2={W - PAD_X} y2={H / 2} stroke="#e7e5e4" strokeWidth="2" />
                </svg>
              )}
              {showDots && chartData?.pts.map((pt, i) => (
                <div
                  key={i}
                  className={styles.dot}
                  style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
                />
              ))}
            </div>

            {/* X-axis labels */}
            <div className={styles.xAxis}>
              {xAxisItems.map((d) => (
                <div key={d.dia} className={styles.xItem}>
                  <span className={styles.xLabel}>{d.dia}</span>
                  <span className={styles.xPedidos}>{loading ? '' : `${d.pedidos}p`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom grid ── */}
        <div className={styles.bottomGrid}>

          {/* Top platos */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Platos más pedidos</h3>
            {loading ? (
              <p style={{ color: '#a8a29e', fontSize: '0.875rem', padding: '1rem 0' }}>Cargando…</p>
            ) : platosTop.length === 0 ? (
              <p style={{ color: '#a8a29e', fontSize: '0.875rem', padding: '1rem 0' }}>Sin datos aún</p>
            ) : (
              <div className={styles.topList}>
                {platosTop.map((p, i) => (
                  <div key={p.nombre} className={styles.topItem}>
                    <span
                      className={styles.topRank}
                      style={{ color: i === 0 ? '#ca8a04' : i === 1 ? '#a8a29e' : i === 2 ? '#b45309' : '#d4d4d0' }}
                    >
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <PlatoImage
                      nombre={p.nombre}
                      categoria={platoMeta.get(p.nombre)?.categoria ?? p.categoria}
                      imageUrl={platoMeta.get(p.nombre)?.imageUrl}
                      size="sm"
                    />
                    <div className={styles.topInfo}>
                      <div className={styles.topHeader}>
                        <span className={styles.topNombre}>{p.nombre}</span>
                        <span className={styles.topCount}>{p.pedidos} uds.</span>
                      </div>
                      <div className={styles.topTrack}>
                        <div className={styles.topFill} style={{ width: `${Math.round((p.pedidos / maxPlato) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Donut — tipos de pedido */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Tipos de pedido</h3>
            {loading ? (
              <p style={{ color: '#a8a29e', fontSize: '0.875rem', padding: '1rem 0' }}>Cargando…</p>
            ) : tipoData.length === 0 ? (
              <p style={{ color: '#a8a29e', fontSize: '0.875rem', padding: '1rem 0' }}>Sin datos aún</p>
            ) : (
              <div className={styles.donutWrap}>
                <svg viewBox="0 0 140 140" className={styles.donutSvg} aria-hidden="true">
                  <g transform="rotate(-90 70 70)">
                    {donutSegs.map((s) => (
                      <circle
                        key={s.label}
                        cx="70" cy="70" r={R}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="18"
                        strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                        strokeDashoffset={-s.offset}
                        strokeLinecap="butt"
                      />
                    ))}
                  </g>
                  <text x="70" y="66" textAnchor="middle" className={styles.donutCenter}>
                    Pedidos
                  </text>
                  <text x="70" y="80" textAnchor="middle" className={styles.donutSub}>
                    {monthLabel.split(' ')[0]}
                  </text>
                </svg>

                <ul className={styles.donutLegend}>
                  {tipoData.map((t) => (
                    <li key={t.label} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: t.color }} />
                      <span className={styles.legendLabel}>{t.label}</span>
                      <span className={styles.legendPct} style={{ color: t.color }}>{t.porcentaje}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
