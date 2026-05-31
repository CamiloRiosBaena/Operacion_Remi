import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { usePlatos } from '@/features/menu/context/PlatosContext';
import {
  fetchDashboardStats,
  fetchPedidos,
  fetchIngredientes,
  type ApiPedido,
  type ApiIngrediente,
} from '../services/admin.service';
import styles from './AdminDashboard.module.css';

/* ── Icons ── */
const ICON_PATHS: Record<string, string> = {
  plus:       '<path d="M12 5v14M5 12h14"/>',
  orders:     '<path d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v4h4M9 11h6M9 15h6M9 7h2"/>',
  money:      '<path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v6M18 9v6"/>',
  dish:       '<path d="M3 11a9 9 0 0 1 18 0Z"/><path d="M2 11h20M12 6V3M11 3h2"/>',
  users:      '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M16.5 14.5a5.5 5.5 0 0 1 4 5.5"/>',
  trendUp:    '<path d="M3 17 10 10l4 4 7-7M21 7v5M21 7h-5"/>',
  trendDown:  '<path d="M3 7 10 14l4-4 7 7M21 17v-5M21 17h-5"/>',
  alert:      '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.5"/>',
  flame:      '<path d="M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3 .5 2 2 2 2 2s-1-4 2-8Z"/>',
  local:      '<path d="M4 9 5 4h14l1 5M4 9h16M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M5 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>',
  delivery:   '<circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.5 18h6M17 15.5 14 8h-2M12 8V6h3l2 4M5 12h5l1.5 3.5"/>',
  menu:       '<path d="M7 3v8M5 3v3a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4 0 0 0 0M17 12v9"/>',
  banner:     '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15.5 8.5a4 4 0 0 1 0 7M18 6a7 7 0 0 1 0 12"/>',
  ingredients:'<path d="M11 20c-3.5 0-7-2.5-7-7 3.5 0 7 2.5 7 7Z"/><path d="M11 20c0-6 3-11 9-13-1 7-4 13-9 13Z"/><path d="M14.5 8.5 18 5"/>',
  tables:     '<path d="M4 9h16M5 9 4 4M19 9l1-5M7 9v11M17 9v11M9.5 9v5h5V9"/>',
  stats:      '<path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/>',
};

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] ?? '' }} />
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 96, h = 42;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 6 - ((v - min) / rng) * (h - 14),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = `sg${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg className="adm-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SPARK_COLORS: Record<string, string> = {
  peach: 'oklch(0.58 0.15 45)',
  sage:  'oklch(0.55 0.09 150)',
  amber: 'oklch(0.6 0.13 75)',
  lilac: 'oklch(0.55 0.11 300)',
};

function formatPrecio(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

const MODULES = [
  { to: '/admin/menu',         title: 'Gestión de Menú',  desc: 'Crear, editar y eliminar platos',   icon: 'menu',        tile: 'peach' },
  { to: '/admin/ingredientes', title: 'Ingredientes',     desc: 'Stock, alertas y platos afectados', icon: 'ingredients', tile: 'sage' },
  { to: '/admin/mesas',        title: 'Mesas y QR',       desc: 'Mesas, estados y códigos QR',       icon: 'tables',      tile: 'amber' },
  { to: '/admin/pedidos',      title: 'Pedidos',          desc: 'Ver todos los pedidos en curso',    icon: 'orders',      tile: 'rose' },
  { to: '/admin/local',        title: 'Entrega en Local', desc: 'Casilleros con QR y Arduino',       icon: 'local',       tile: 'sky' },
  { to: '/admin/domicilios',   title: 'Domicilios',       desc: 'Asignar y monitorear entregas',     icon: 'delivery',    tile: 'sky' },
  { to: '/admin/usuarios',     title: 'Usuarios',         desc: 'Gestionar roles y accesos',         icon: 'users',       tile: 'lilac' },
  { to: '/admin/estadisticas', title: 'Estadísticas',     desc: 'Reportes de ventas y métricas',     icon: 'stats',       tile: 'sage' },
  { to: '/admin/promos',       title: 'Banners',          desc: 'Promociones y destacados',          icon: 'banner',      tile: 'peach' },
];

const STATUS_CHIP: Record<string, string> = {
  pendiente: 'adm-chip adm-chip-info', en_cocina: 'adm-chip adm-chip-warn',
  listo: 'adm-chip adm-chip-ok', en_camino: 'adm-chip adm-chip-info',
  entregado: 'adm-chip adm-chip-ok', pagado: 'adm-chip adm-chip-ok',
};
const STATUS_LABEL: Record<string, string> = {
  pendiente:'Recibido', en_cocina:'Preparando', listo:'Listo',
  en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado',
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const { platos } = usePlatos();
  const [stats, setStats] = useState({ pedidosHoy: 0, ingresosHoy: 0, totalUsuarios: 0, pedidosActivos: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [pedidos, setPedidos]           = useState<ApiPedido[]>([]);
  const [ingredientes, setIngredientes] = useState<ApiIngrediente[]>([]);
  const [filtroRango, setFiltroRango]   = useState<'hoy' | 'semana' | 'mes'>('hoy');

  const cargar = useCallback(async () => {
    try {
      const [s, p, ing] = await Promise.all([
        fetchDashboardStats(),
        fetchPedidos(),
        fetchIngredientes(),
      ]);
      setStats(s);
      setPedidos(p);
      setIngredientes(ing);
    } catch (err) { console.error(err); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const platosActivos = platos.filter(p => p.disponible).length;

  // ── Filtro de rango ──
  const pedidosDelRango = useMemo(() => {
    const now = new Date();
    return pedidos.filter(p => {
      const f = new Date(p.fechaHora);
      if (filtroRango === 'hoy') return f.toDateString() === now.toDateString();
      if (filtroRango === 'semana') {
        const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0,0,0,0);
        return f >= start;
      }
      return f >= new Date(now.getFullYear(), now.getMonth(), 1);
    });
  }, [pedidos, filtroRango]);
  const pedidosRangoCount = pedidosDelRango.length;
  const ingresosRango = pedidosDelRango.filter(p => p.estado !== 'cancelado').reduce((s,p) => s + Number(p.total), 0);
  const rangoSufijo = filtroRango === 'hoy' ? 'hoy' : filtroRango === 'semana' ? 'esta semana' : 'este mes';

  // ── Ventas últimos 7 días ──
  const salesWeek = (() => {
    const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toDateString();
      const v = pedidos
        .filter(p => new Date(p.fechaHora).toDateString() === dayStr && p.estado !== 'cancelado')
        .reduce((s, p) => s + Number(p.total), 0);
      return { d: DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1], v };
    });
  })();
  const maxV = Math.max(...salesWeek.map(s => s.v), 1);

  // ── Pedidos recientes ──
  const recentOrders = [...pedidos]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 5);

  // ── Top platos (de todos los pedidos no cancelados) ──
  const platoMap = new Map<string, { sold: number; rev: number; cat: string }>();
  for (const p of pedidos.filter(x => x.estado !== 'cancelado')) {
    for (const d of (p.detalles ?? [])) {
      const prev = platoMap.get(d.plato.nombre) ?? { sold: 0, rev: 0, cat: '' };
      platoMap.set(d.plato.nombre, { sold: prev.sold + d.cantidad, rev: prev.rev + Number(d.subtotal ?? 0), cat: prev.cat });
    }
  }
  const topDishes = [...platoMap.entries()]
    .sort((a, b) => b[1].sold - a[1].sold)
    .slice(0, 4)
    .map(([name, info]) => ({ name, ...info }));

  // ── Ingredientes bajo stock — usa relaciones reales ──
  const ingRelsFlat = ingredientes.flatMap(ing =>
    ing.platoIngredientes.map(pi => ({
      ingredienteId: ing.id,
      gramosPorPorcion: Number(pi.gramosPorPorcion),
    }))
  );
  function calcPorcDash(ing: ApiIngrediente): number | null {
    const rels = ingRelsFlat.filter(r => r.ingredienteId === ing.id);
    if (!rels.length) return null;
    const g = Number(ing.stockUnidades) * Number(ing.gramosPorUnidad);
    const vals = rels.map(r => Math.floor(g / r.gramosPorPorcion));
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const lowStock = ingredientes
    .filter(ing => {
      if (Number(ing.stockUnidades) === 0) return true;
      const p = calcPorcDash(ing);
      return p !== null && p < ing.stockMinimoPorciones;
    })
    .slice(0, 4)
    .map(ing => {
      const p = calcPorcDash(ing);
      const min = ing.stockMinimoPorciones || 1;
      const pct = p !== null ? Math.min(100, Math.round(p / min * 100)) : 0;
      return {
        name:  ing.nombre,
        pct,
        unit:  ing.unidadCompra,
        level: (Number(ing.stockUnidades) === 0 ? 'bad' : 'warn') as 'bad' | 'warn',
      };
    });

  const KPIS = [
    {
      label:`Pedidos ${rangoSufijo}`, tile:'peach', icon:'orders',
      value: loadingStats ? '…' : String(pedidosRangoCount),
      delta:0, up:true, deltaLabel:rangoSufijo,
      spark:[...Array(7)].map((_,i) => {
        const d = new Date(); d.setDate(d.getDate()-(6-i));
        return pedidos.filter(p=>new Date(p.fechaHora).toDateString()===d.toDateString()).length;
      }),
    },
    {
      label:`Ingresos ${rangoSufijo}`, tile:'sage', icon:'money',
      value: loadingStats ? '…' : formatPrecio(ingresosRango),
      delta:0, up:true, deltaLabel:rangoSufijo,
      spark:[...Array(7)].map((_,i) => {
        const d = new Date(); d.setDate(d.getDate()-(6-i));
        return pedidos.filter(p=>new Date(p.fechaHora).toDateString()===d.toDateString()&&p.estado!=='cancelado').reduce((s,p)=>s+Number(p.total),0);
      }),
    },
    {
      label:'Platos activos', tile:'amber', icon:'dish',
      value: String(platosActivos),
      delta:0, up:false, deltaLabel:`${platos.filter(p=>!p.disponible).length} agotados`,
      spark:[...Array(7)].fill(platosActivos),
    },
    {
      label:'Usuarios', tile:'lilac', icon:'users',
      value: loadingStats ? '…' : String(stats.totalUsuarios),
      delta:0, up:true, deltaLabel:'total',
      spark:[...Array(7)].fill(stats.totalUsuarios || 1),
    },
  ];

  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleDateString('es', { month: 'long' });
  const wd = now.toLocaleDateString('es', { weekday: 'long' });

  return (
    <AdminLayout title="Dashboard" subtitle="Resumen general del restaurante">
      <div className="adm-view">

        {/* Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerBody}>
            <h2>Bienvenido de nuevo, <b>Admin</b></h2>
            <p>Gestiona el menú, los pedidos, los usuarios y las métricas del restaurante desde un solo lugar.</p>
            <div className={styles.bannerActions}>
              <button className="adm-btn adm-btn-primary" onClick={() => navigate('/admin/menu')}>
                <Icon name="plus" size={17} /> Nuevo plato
              </button>
              <button className={styles.bannerBtnGhost} onClick={() => navigate('/admin/pedidos')}>
                <Icon name="orders" size={17} /> Ver pedidos
              </button>
            </div>
          </div>
          <div className={styles.bannerAside}>
            <div className={styles.bannerDay}>{day}</div>
            <div className={styles.bannerDateRest}>{wd}, {day} de {month}</div>
            <div className={styles.bannerLive}>
              <span className={styles.liveDot} />
              Restaurante abierto
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="adm-section-row" style={{ marginTop: 0 }}>
          <div><div className="adm-section-title">Resumen {filtroRango === 'hoy' ? 'de hoy' : filtroRango === 'semana' ? 'de la semana' : 'del mes'}</div></div>
          <div className="adm-seg">
            <button className={filtroRango === 'hoy'    ? 'active' : ''} onClick={() => setFiltroRango('hoy')}>Hoy</button>
            <button className={filtroRango === 'semana' ? 'active' : ''} onClick={() => setFiltroRango('semana')}>Semana</button>
            <button className={filtroRango === 'mes'    ? 'active' : ''} onClick={() => setFiltroRango('mes')}>Mes</button>
          </div>
        </div>
        <div className={styles.kpiGrid}>
          {KPIS.map(k => (
            <div key={k.label} className="adm-kpi">
              <div className="adm-kpi-top">
                <div className="adm-kpi-label">{k.label}</div>
                <div className={`adm-tile ${k.tile}`} style={{ width:40, height:40, borderRadius:11 }}>
                  <Icon name={k.icon} size={22} />
                </div>
              </div>
              <div className="adm-kpi-value">{k.value}</div>
              <div className="adm-kpi-foot">
                <span className="muted">{k.deltaLabel}</span>
              </div>
              <Sparkline data={k.spark} color={SPARK_COLORS[k.tile]} />
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="adm-section-row">
          <div><div className="adm-section-title">Actividad</div><div className="adm-section-sub">Ventas y stock en tiempo real</div></div>
        </div>
        <div className={styles.dashGrid}>
          {/* Bar chart */}
          <div className="adm-panel">
            <div className="adm-panel-head">
              <div><h3>Ingresos · últimos 7 días</h3><div className="adm-panel-sub">Total: <b style={{ color:'var(--adm-ink)' }}>{formatPrecio(salesWeek.reduce((s,d)=>s+d.v,0))}</b></div></div>
            </div>
            <div className="adm-panel-body">
              <div className="adm-chart">
                {salesWeek.map(s => (
                  <div key={s.d} className="adm-bar-col">
                    <div className="adm-bar-track">
                      <div className="adm-bar" style={{ height:`${Math.round((s.v/maxV)*100)}%` }}>
                        <span className="adm-bar-tip">{formatPrecio(s.v)}</span>
                      </div>
                    </div>
                    <div className="adm-bar-label">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent orders */}
          <div className="adm-panel">
            <div className="adm-panel-head">
              <div><h3>Pedidos recientes</h3></div>
              <button className="adm-btn adm-btn-ghost" style={{ padding:'7px 12px', fontSize:13 }} onClick={() => navigate('/admin/pedidos')}>Ver todos</button>
            </div>
            <div className="adm-panel-body" style={{ paddingTop:6 }}>
              <div className="adm-list">
                {recentOrders.length === 0 ? (
                  <div className="adm-empty" style={{ padding:'20px 0' }}>Sin pedidos recientes</div>
                ) : recentOrders.map(p => {
                  const label = p.tipo==='mesa'&&p.mesa ? `Mesa ${p.mesa.numero}` : p.cliente?.nombre ?? 'Invitado';
                  const tile  = p.tipo==='mesa' ? 'amber' : p.tipo==='domicilio' ? 'sky' : 'peach';
                  const icon  = p.tipo==='mesa' ? 'local' : p.tipo==='domicilio' ? 'delivery' : 'orders';
                  return (
                    <div key={p.id} className="adm-list-row">
                      <div className={`adm-tile ${tile}`} style={{ width:40, height:40, borderRadius:11 }}>
                        <Icon name={icon} size={20} />
                      </div>
                      <div className="adm-list-main">
                        <div className="adm-list-title">#{p.id} · {label}</div>
                        <div className="adm-list-meta">{p.tipo}</div>
                      </div>
                      <div className="adm-list-right">
                        <div className="adm-list-amt">{formatPrecio(p.total)}</div>
                        <div style={{ marginTop:5 }}>
                          <span className={STATUS_CHIP[p.estado] ?? 'adm-chip adm-chip-neutral'}>
                            <span className="adm-chip-dot" />{STATUS_LABEL[p.estado] ?? p.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Top dishes + Low stock */}
        <div className="adm-cols-2" style={{ marginBottom:28 }}>
          <div className="adm-panel">
            <div className="adm-panel-head">
              <div><h3>Platos más vendidos</h3><div className="adm-panel-sub">Todas las ventas</div></div>
              <div className="adm-tile peach" style={{ width:38, height:38, borderRadius:11 }}><Icon name="flame" size={21}/></div>
            </div>
            <div className="adm-panel-body" style={{ paddingTop:6 }}>
              {topDishes.length === 0 ? (
                <div className="adm-empty" style={{ padding:'16px 0' }}>Sin datos</div>
              ) : (
                <div className="adm-list">
                  {topDishes.map((t, i) => (
                    <div key={t.name} className="adm-list-row" style={{ cursor:'default' }}>
                      <div style={{ width:26, fontFamily:'var(--adm-font-display)', fontStyle:'italic', fontSize:19, color:'var(--adm-accent)', fontWeight:600, flexShrink:0 }}>{i+1}</div>
                      <div className="adm-list-main">
                        <div className="adm-list-title">{t.name}</div>
                        <div className="adm-list-meta">{t.sold} vendidos</div>
                      </div>
                      <div className="adm-list-right"><div className="adm-list-amt">{formatPrecio(t.rev)}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-head">
              <div><h3>Stock bajo</h3><div className="adm-panel-sub">{lowStock.length} ingredientes requieren atención</div></div>
              <button className="adm-btn adm-btn-ghost" style={{ padding:'7px 12px', fontSize:13 }} onClick={() => navigate('/admin/ingredientes')}>Reabastecer</button>
            </div>
            <div className="adm-panel-body" style={{ paddingTop:10 }}>
              {lowStock.length === 0 ? (
                <div className="adm-empty" style={{ padding:'16px 0' }}>Stock OK ✓</div>
              ) : lowStock.map(s => {
                const col = s.level==='bad' ? 'var(--adm-bad)' : 'var(--adm-warn)';
                const bg  = s.level==='bad' ? 'var(--adm-bad-bg)' : 'var(--adm-warn-bg)';
                return (
                  <div key={s.name} className={styles.stockRow}>
                    <div className="adm-tile" style={{ width:36, height:36, borderRadius:10, background:bg, color:col, flexShrink:0 }}>
                      <Icon name="alert" size={18}/>
                    </div>
                    <div className={styles.stockMain}>
                      <div className={styles.stockName}>
                        <span>{s.name}</span>
                        <span className={styles.stockQty}>{s.pct}% del mínimo</span>
                      </div>
                      <div className="adm-progress"><span style={{ width:`${s.pct}%`, background:col }}/></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Módulos */}
        <div className="adm-section-row"><div><div className="adm-section-title">Módulos</div><div className="adm-section-sub">Accede a cada área de gestión</div></div></div>
        <div className={styles.modGrid}>
          {MODULES.map(m => (
            <button key={m.to} className={styles.modCard} onClick={() => navigate(m.to)}>
              <div className={`adm-tile ${m.tile}`}><Icon name={m.icon} size={23}/></div>
              <div className={styles.modBody}><div className={styles.modTitle}>{m.title}</div><div className={styles.modDesc}>{m.desc}</div></div>
              <div className={styles.modArrow}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
