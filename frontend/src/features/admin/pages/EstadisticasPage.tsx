import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { PlatoImage } from '@/shared/components/PlatoImage';
import styles from './EstadisticasPage.module.css';

const VENTAS_SEMANA = [
  { dia: 'Lun', ventas: 185000, pedidos: 12 },
  { dia: 'Mar', ventas: 240000, pedidos: 16 },
  { dia: 'Mié', ventas: 198000, pedidos: 13 },
  { dia: 'Jue', ventas: 320000, pedidos: 21 },
  { dia: 'Vie', ventas: 415000, pedidos: 28 },
  { dia: 'Sáb', ventas: 512000, pedidos: 35 },
  { dia: 'Dom', ventas: 380000, pedidos: 25 },
];

const PLATOS_TOP = [
  { nombre: 'Bandeja Paisa',       pedidos: 87, porcentaje: 100, categoria: 'Platos fuertes' },
  { nombre: 'Ajiaco Bogotano',     pedidos: 64, porcentaje:  74, categoria: 'Platos fuertes' },
  { nombre: 'Empanadas (x3)',      pedidos: 58, porcentaje:  67, categoria: 'Entradas'       },
  { nombre: 'Sancocho de Gallina', pedidos: 41, porcentaje:  47, categoria: 'Platos fuertes' },
  { nombre: 'Patacones con Hogao', pedidos: 35, porcentaje:  40, categoria: 'Entradas'       },
];

const METODOS_PAGO = [
  { metodo: 'Tarjeta crédito',  porcentaje: 45, color: '#7c3aed' },
  { metodo: 'Nequi / Daviplata', porcentaje: 32, color: '#d4500a' },
  { metodo: 'PSE',              porcentaje: 14, color: '#0284c7' },
  { metodo: 'Efectivo',         porcentaje:  9, color: '#16a34a' },
];

// ── SVG area chart helpers ─────────────────────────────────────────────────
const W = 700;
const H = 160;
const PAD_X = 10;
const PAD_Y = 16;

function buildPaths(values: number[]) {
  const max = Math.max(...values);
  const pts = values.map((v, i) => ({
    x: PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + (1 - v / max) * (H - PAD_Y * 2),
  }));

  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cpx = (pts[i].x + pts[i + 1].x) / 2;
    line += ` C ${cpx.toFixed(1)} ${pts[i].y.toFixed(1)}, ${cpx.toFixed(1)} ${pts[i + 1].y.toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }

  const area =
    `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`;

  return { pts, line, area };
}

// ── Donut chart helpers ────────────────────────────────────────────────────
const R = 54;
const CIRC = 2 * Math.PI * R; // ≈ 339.3

function buildDonut() {
  let offset = 0;
  const GAP = 3; // gap between segments in px
  const totalGap = GAP * METODOS_PAGO.length;
  const usable = CIRC - totalGap;

  return METODOS_PAGO.map((m) => {
    const dash = (m.porcentaje / 100) * usable;
    const seg = { ...m, dash, offset };
    offset += dash + GAP;
    return seg;
  });
}

function formatPrecio(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;
}

const KPI_ACCENT = ['#d4500a', '#7c3aed', '#0284c7', '#ca8a04'];

export function EstadisticasPage() {
  const totalSemana    = VENTAS_SEMANA.reduce((s, d) => s + d.ventas,  0);
  const totalPedidos   = VENTAS_SEMANA.reduce((s, d) => s + d.pedidos, 0);
  const ticketPromedio = Math.round(totalSemana / totalPedidos);

  const { pts, line, area } = buildPaths(VENTAS_SEMANA.map((d) => d.ventas));
  const donutSegs = buildDonut();

  const KPIS = [
    { label: 'Ventas semana',    value: formatPrecio(totalSemana),                   meta: '↑ +12% vs semana anterior', icon: '💰' },
    { label: 'Pedidos totales',  value: String(totalPedidos),                        meta: '↑ +8% vs semana anterior',  icon: '📦' },
    { label: 'Ticket promedio',  value: `$${ticketPromedio.toLocaleString('es-CO')}`, meta: 'Por pedido esta semana',    icon: '🧾' },
    { label: 'Mejor día',        value: 'Sábado',                                    meta: `35 pedidos — ${formatPrecio(512000)}`, icon: '🏆' },
  ];

  return (
    <AdminLayout title="Estadísticas">
      <div className={styles.wrapper}>

        {/* ── Sub-header ── */}
        <div className={styles.subHeader}>
          <p className={styles.subHeadText}>Resumen de la semana actual</p>
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
              <p className={styles.kpiValue}>{k.value}</p>
              <p className={styles.kpiMeta}>{k.meta}</p>
            </div>
          ))}
        </div>

        {/* ── Area chart — ventas por día ── */}
        <div className={styles.areaCard}>
          <div className={styles.areaHeader}>
            <div>
              <h3 className={styles.areaTitle}>Ventas por día</h3>
              <p className={styles.areaSub}>Esta semana · en pesos colombianos</p>
            </div>
            <span className={styles.areaBadge}>{formatPrecio(totalSemana)} total</span>
          </div>

          <div className={styles.svgWrap}>
            {/* Y-axis grid lines */}
            <div className={styles.yGrid}>
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <div key={f} className={styles.yLine} style={{ bottom: `${f * 100}%` }}>
                  <span className={styles.yLabel}>{formatPrecio(512000 * f)}</span>
                </div>
              ))}
            </div>

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
              {/* Area fill */}
              <path d={area} fill="url(#areaGrad)" />
              {/* Line */}
              <path d={line} fill="none" stroke="#d4500a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Data points */}
              {pts.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#d4500a" />
                  <circle cx={pt.x} cy={pt.y} r="9" fill="#d4500a" fillOpacity="0.15" />
                </g>
              ))}
            </svg>

            {/* X-axis labels */}
            <div className={styles.xAxis}>
              {VENTAS_SEMANA.map((d, i) => (
                <div key={d.dia} className={styles.xItem}>
                  <span className={styles.xLabel}>{d.dia}</span>
                  <span className={styles.xPedidos}>{d.pedidos}p</span>
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
            <div className={styles.topList}>
              {PLATOS_TOP.map((p, i) => (
                <div key={p.nombre} className={styles.topItem}>
                  <span className={styles.topRank}
                    style={{ color: i === 0 ? '#ca8a04' : i === 1 ? '#a8a29e' : i === 2 ? '#b45309' : '#d4d4d0' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <PlatoImage nombre={p.nombre} categoria={p.categoria} size="sm" />
                  <div className={styles.topInfo}>
                    <div className={styles.topHeader}>
                      <span className={styles.topNombre}>{p.nombre}</span>
                      <span className={styles.topCount}>{p.pedidos} pedidos</span>
                    </div>
                    <div className={styles.topTrack}>
                      <div className={styles.topFill} style={{ width: `${p.porcentaje}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Donut — métodos de pago */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Métodos de pago</h3>
            <div className={styles.donutWrap}>
              <svg viewBox="0 0 140 140" className={styles.donutSvg} aria-hidden="true">
                <g transform="rotate(-90 70 70)">
                  {donutSegs.map((s) => (
                    <circle
                      key={s.metodo}
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
                  Pagos
                </text>
                <text x="70" y="80" textAnchor="middle" className={styles.donutSub}>
                  esta semana
                </text>
              </svg>

              <ul className={styles.donutLegend}>
                {METODOS_PAGO.map((m) => (
                  <li key={m.metodo} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: m.color }} />
                    <span className={styles.legendLabel}>{m.metodo}</span>
                    <span className={styles.legendPct} style={{ color: m.color }}>{m.porcentaje}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className={styles.note}>Datos de ejemplo — se actualizarán al conectar la base de datos.</p>
      </div>
    </AdminLayout>
  );
}
