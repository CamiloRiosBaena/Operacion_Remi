import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { PlatoImage } from '@/shared/components/PlatoImage';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import { fetchPedidos, type ApiPedido } from '../services/admin.service';
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

// ── Aggregation helpers ────────────────────────────────────────────────────

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
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
  const [pedidos,  setPedidos ] = useState<ApiPedido[]>([]);
  const [loading,  setLoading ] = useState(true);
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

  // ── Ventas últimos 7 días ──────────────────────────────────────────────
  const days7 = getLast7Days();

  const ventasSemana = days7.map((day) => {
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const del_dia = pedidos.filter((p) => {
      const f = new Date(p.fechaHora);
      return f >= day && f < nextDay && p.estado !== 'cancelado';
    });
    return {
      dia:     DAYS_ES[day.getDay()],
      ventas:  del_dia.reduce((s, p) => s + Number(p.total), 0),
      pedidos: del_dia.length,
    };
  });

  const totalSemana    = ventasSemana.reduce((s, d) => s + d.ventas,  0);
  const totalPedidos   = ventasSemana.reduce((s, d) => s + d.pedidos, 0);
  const ticketPromedio = totalPedidos > 0 ? Math.round(totalSemana / totalPedidos) : 0;

  const mejorDia = ventasSemana.reduce((best, d) => d.ventas > best.ventas ? d : best, ventasSemana[0]);

  const KPIS = [
    { label: 'Ventas semana',   value: formatPrecio(totalSemana),                     meta: 'Últimos 7 días (sin cancelados)', icon: '💰' },
    { label: 'Pedidos totales', value: String(totalPedidos),                           meta: 'Últimos 7 días',                 icon: '📦' },
    { label: 'Ticket promedio', value: `$${ticketPromedio.toLocaleString('es-CO')}`,   meta: 'Por pedido',                     icon: '🧾' },
    { label: 'Mejor día',       value: mejorDia?.dia ?? '—',                           meta: mejorDia ? `${mejorDia.pedidos} pedidos — ${formatPrecio(mejorDia.ventas)}` : '', icon: '🏆' },
  ];

  // ── Pedidos de la semana (base para top platos y tipos) ─────────────────
  const pedidosSemana = pedidos.filter((p) => {
    const d = new Date(p.fechaHora);
    return d >= days7[0] && p.estado !== 'cancelado';
  });

  // ── Top platos (últimos 7 días) ──────────────────────────────────────────
  const platoCount = new Map<string, { pedidos: number; categoria: string }>();
  for (const p of pedidosSemana) {
    for (const d of (p.detalles ?? [])) {
      const key = d.plato.nombre;
      const prev = platoCount.get(key) ?? { pedidos: 0, categoria: '' };
      platoCount.set(key, { pedidos: prev.pedidos + d.cantidad, categoria: prev.categoria });
    }
  }
  const platosTop = [...platoCount.entries()]
    .sort((a, b) => b[1].pedidos - a[1].pedidos)
    .slice(0, 5)
    .map(([nombre, info]) => ({ nombre, ...info }));
  const maxPlato = platosTop[0]?.pedidos ?? 1;

  // ── Tipos de pedido ──────────────────────────────────────────────────────
  const totalTipos = pedidosSemana.length || 1;
  const tipoData = ['mesa', 'domicilio', 'llevar'].map((tipo) => {
    const count = pedidosSemana.filter((p) => p.tipo === tipo).length;
    return {
      label: TIPO_META[tipo].label,
      color: TIPO_META[tipo].color,
      porcentaje: Math.round((count / totalTipos) * 100),
      count,
    };
  }).filter((t) => t.count > 0);

  const donutSegs = buildDonut(tipoData);

  const chartData = buildPaths(ventasSemana.map((d) => d.ventas));
  const maxVenta  = Math.max(...ventasSemana.map((d) => d.ventas), 1);

  return (
    <AdminLayout title="Estadísticas">
      <div className={styles.wrapper}>

        {/* ── Sub-header ── */}
        <div className={styles.subHeader}>
          <p className={styles.subHeadText}>
            {loading ? 'Cargando datos…' : 'Resumen de los últimos 7 días'}
          </p>
          <Link to="/menu" className={styles.clientLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Ver menú del cliente
          </Link>
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
              <p className={styles.areaSub}>Últimos 7 días · en pesos colombianos</p>
            </div>
            <span className={styles.areaBadge}>{formatPrecio(totalSemana)} total</span>
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
              {chartData?.pts.map((pt, i) => (
                <div
                  key={i}
                  className={styles.dot}
                  style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
                />
              ))}
            </div>

            {/* X-axis labels */}
            <div className={styles.xAxis}>
              {ventasSemana.map((d) => (
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
                    <span className={styles.topRank}
                      style={{ color: i === 0 ? '#ca8a04' : i === 1 ? '#a8a29e' : i === 2 ? '#b45309' : '#d4d4d0' }}>
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
                    esta semana
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
