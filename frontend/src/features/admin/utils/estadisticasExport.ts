import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ApiPedido } from '../services/admin.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const MONTHS_SHORT = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
];

function getMonthLabel(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthShort(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthBounds(offset: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const afterLast = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  return { first, afterLast };
}

function daysInMonth(offset: number): Date[] {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1));
}

// ── Rangos disponibles ─────────────────────────────────────────────────────────

export interface ExportRango {
  numMeses: number;
  label: string;
}

export const RANGOS_EXPORT: ExportRango[] = [
  { numMeses: 1,  label: '1 mes'   },
  { numMeses: 3,  label: '3 meses' },
  { numMeses: 6,  label: '6 meses' },
  { numMeses: 9,  label: '9 meses' },
  { numMeses: 12, label: 'Anual'   },
];

// ── Estructura de datos calculados ─────────────────────────────────────────────

export interface ExportData {
  periodoLabel: string;
  summary: {
    totalVentas: number;
    totalPedidos: number;
    ticketPromedio: number;
    totalCancelados: number;
  };
  porMes: Array<{
    mes: string;
    pedidos: number;
    cancelados: number;
    total: number;
    ticketPromedio: number;
  }>;
  porDia: Array<{ fecha: string; pedidos: number; total: number }>;
  platosTop: Array<{ nombre: string; unidades: number }>;
  tipos: Array<{ tipo: string; pedidos: number; porcentaje: number; total: number }>;
}

// ── Cálculo de datos para exportación ─────────────────────────────────────────
// El período cubre `numMeses` meses consecutivos que terminan en `endOffset`.

export function calcExportData(
  pedidos: ApiPedido[],
  endOffset: number,
  numMeses: number,
): ExportData {
  // Construir lista de meses del período
  const meses = Array.from({ length: numMeses }, (_, i) => {
    const offset = endOffset - (numMeses - 1 - i);
    const { first, afterLast } = getMonthBounds(offset);
    return { offset, first, afterLast, label: getMonthLabel(offset) };
  });

  const rangeStart = meses[0].first;
  const rangeEnd   = meses[meses.length - 1].afterLast;

  const enRango = pedidos.filter((p) => {
    const f = new Date(p.fechaHora);
    return f >= rangeStart && f < rangeEnd;
  });

  // ── Por mes ────────────────────────────────────────────────────────────────
  const porMes = meses.map((m) => {
    const delMes   = enRango.filter((p) => {
      const f = new Date(p.fechaHora);
      return f >= m.first && f < m.afterLast;
    });
    const activos  = delMes.filter((p) => p.estado !== 'cancelado');
    const cancelados = delMes.length - activos.length;
    const total    = activos.reduce((s, p) => s + Number(p.total), 0);
    return {
      mes:            m.label,
      pedidos:        activos.length,
      cancelados,
      total,
      ticketPromedio: activos.length > 0 ? Math.round(total / activos.length) : 0,
    };
  });

  // ── Por día (solo para rango de 1 mes) ────────────────────────────────────
  let porDia: ExportData['porDia'] = [];
  if (numMeses === 1) {
    const dias = daysInMonth(endOffset);
    porDia = dias.map((day) => {
      const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      const delDia  = enRango.filter((p) => {
        const f = new Date(p.fechaHora);
        return f >= day && f < nextDay && p.estado !== 'cancelado';
      });
      return {
        fecha:   `${String(day.getDate()).padStart(2,'0')}/${String(day.getMonth()+1).padStart(2,'0')}/${day.getFullYear()}`,
        pedidos: delDia.length,
        total:   delDia.reduce((s, p) => s + Number(p.total), 0),
      };
    });
  }

  // ── Top platos ─────────────────────────────────────────────────────────────
  const platoCount = new Map<string, number>();
  for (const p of enRango.filter((x) => x.estado !== 'cancelado')) {
    for (const d of (p.detalles ?? [])) {
      platoCount.set(d.plato.nombre, (platoCount.get(d.plato.nombre) ?? 0) + d.cantidad);
    }
  }
  const platosTop = [...platoCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nombre, unidades]) => ({ nombre, unidades }));

  // ── Tipos de pedido ────────────────────────────────────────────────────────
  const activos = enRango.filter((p) => p.estado !== 'cancelado');
  const tipos = (['mesa', 'domicilio', 'llevar'] as const).map((tipo) => {
    const ps = activos.filter((p) => p.tipo === tipo);
    return {
      tipo:       tipo === 'mesa' ? 'Mesa' : tipo === 'domicilio' ? 'Domicilio' : 'Para llevar',
      pedidos:    ps.length,
      porcentaje: activos.length > 0 ? Math.round((ps.length / activos.length) * 100) : 0,
      total:      ps.reduce((s, p) => s + Number(p.total), 0),
    };
  }).filter((t) => t.pedidos > 0);

  // ── Resumen ────────────────────────────────────────────────────────────────
  const totalVentas    = porMes.reduce((s, m) => s + m.total, 0);
  const totalPedidos   = porMes.reduce((s, m) => s + m.pedidos, 0);
  const totalCancelados = porMes.reduce((s, m) => s + m.cancelados, 0);

  const primerMes = meses[0];
  const ultimoMes = meses[meses.length - 1];
  const periodoLabel = numMeses === 1
    ? primerMes.label
    : `${getMonthShort(primerMes.offset)} – ${getMonthShort(ultimoMes.offset)}`;

  return {
    periodoLabel,
    summary: {
      totalVentas,
      totalPedidos,
      ticketPromedio: totalPedidos > 0 ? Math.round(totalVentas / totalPedidos) : 0,
      totalCancelados,
    },
    porMes,
    porDia,
    platosTop,
    tipos,
  };
}

// ── Exportar Excel ─────────────────────────────────────────────────────────────

export function exportarExcel(data: ExportData, numMeses: number): void {
  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen ──────────────────────────────────────────────────────
  const wsResumen = XLSX.utils.aoa_to_sheet([
    ['Operación Remi — Estadísticas'],
    [],
    ['Período',              data.periodoLabel],
    ['Generado',             new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })],
    [],
    ['RESUMEN GENERAL'],
    ['Métrica',                          'Valor'],
    ['Ventas totales (sin cancelados)',   data.summary.totalVentas],
    ['Total pedidos',                    data.summary.totalPedidos],
    ['Ticket promedio',                  data.summary.ticketPromedio],
    ['Pedidos cancelados',               data.summary.totalCancelados],
  ]);
  wsResumen['!cols'] = [{ wch: 36 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ── Hoja 2: Desglose temporal ────────────────────────────────────────────
  if (numMeses === 1) {
    const rows: (string | number)[][] = [
      ['Fecha', 'Pedidos activos', 'Ventas ($)'],
      ...data.porDia.map((d) => [d.fecha, d.pedidos, d.total]),
      [],
      ['TOTAL', data.porDia.reduce((s, d) => s + d.pedidos, 0), data.porDia.reduce((s, d) => s + d.total, 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas por día');
  } else {
    const rows: (string | number)[][] = [
      ['Mes', 'Pedidos', 'Cancelados', 'Ventas ($)', 'Ticket Prom. ($)'],
      ...data.porMes.map((m) => [m.mes, m.pedidos, m.cancelados, m.total, m.ticketPromedio]),
      [],
      ['TOTAL',
        data.porMes.reduce((s, m) => s + m.pedidos, 0),
        data.porMes.reduce((s, m) => s + m.cancelados, 0),
        data.porMes.reduce((s, m) => s + m.total, 0),
        '',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas por mes');
  }

  // ── Hoja 3: Top platos ───────────────────────────────────────────────────
  const rowsPlatos: (string | number)[][] = [
    ['#', 'Plato', 'Unidades vendidas'],
    ...data.platosTop.map((p, i) => [i + 1, p.nombre, p.unidades]),
  ];
  const wsPlatos = XLSX.utils.aoa_to_sheet(rowsPlatos);
  wsPlatos['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsPlatos, 'Platos más pedidos');

  // ── Hoja 4: Tipos de pedido ──────────────────────────────────────────────
  const rowsTipos: (string | number)[][] = [
    ['Tipo', 'Pedidos', '% del total', 'Ventas ($)'],
    ...data.tipos.map((t) => [t.tipo, t.pedidos, `${t.porcentaje}%`, t.total]),
  ];
  const wsTipos = XLSX.utils.aoa_to_sheet(rowsTipos);
  wsTipos['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 13 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsTipos, 'Tipos de pedido');

  const filename = `remi_stats_${data.periodoLabel.replace(/[\s–/]/g, '_').toLowerCase()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── Exportar PDF ───────────────────────────────────────────────────────────────

const BRAND     = [212, 80, 10]  as [number, number, number];
const BRAND_BG  = [255, 247, 237] as [number, number, number];
const GRAY_TEXT = [120, 113, 108] as [number, number, number];
const TEXT      = [28, 25, 23]   as [number, number, number];
const WHITE     = [255, 255, 255] as [number, number, number];
const GREEN     = [21, 128, 61]  as [number, number, number];
const GREEN_BG  = [240, 253, 244] as [number, number, number];

function colNum(arr: [number, number, number]): string {
  return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
}

export function exportarPDF(data: ExportData, numMeses: number): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Encabezado con banda de color ────────────────────────────────────────
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Operación Remi — Estadísticas', 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${data.periodoLabel}`, 14, 17);
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}`,
    196, 17, { align: 'right' },
  );

  let y = 32;

  // ── Sección: Resumen ─────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('Resumen del período', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Ventas totales (sin cancelados)', `$${data.summary.totalVentas.toLocaleString('es-CO')}`],
      ['Total pedidos activos',           String(data.summary.totalPedidos)],
      ['Ticket promedio',                 `$${data.summary.ticketPromedio.toLocaleString('es-CO')}`],
      ['Pedidos cancelados',              String(data.summary.totalCancelados)],
    ],
    styles:           { fontSize: 8.5, cellPadding: 3 },
    headStyles:       { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: BRAND_BG },
    columnStyles:     { 0: { cellWidth: 95 }, 1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' } },
    margin:           { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Sección: Desglose temporal ───────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text(numMeses === 1 ? 'Ventas por día' : 'Ventas por mes', 14, y);
  y += 3;

  if (numMeses === 1) {
    const diasConVentas = data.porDia.filter((d) => d.pedidos > 0);
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Pedidos', 'Ventas']],
      body: diasConVentas.length > 0
        ? diasConVentas.map((d) => [d.fecha, String(d.pedidos), `$${d.total.toLocaleString('es-CO')}`])
        : [['Sin ventas', '0', '$0']],
      styles:           { fontSize: 8, cellPadding: 2.5 },
      headStyles:       { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: BRAND_BG },
      columnStyles:     { 1: { halign: 'center' }, 2: { halign: 'right' } },
      margin:           { left: 14, right: 14 },
    });
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Mes', 'Pedidos', 'Cancelados', 'Ventas', 'Ticket Prom.']],
      body: data.porMes.map((m) => [
        m.mes,
        String(m.pedidos),
        String(m.cancelados),
        `$${m.total.toLocaleString('es-CO')}`,
        `$${m.ticketPromedio.toLocaleString('es-CO')}`,
      ]),
      styles:           { fontSize: 8, cellPadding: 2.5 },
      headStyles:       { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: BRAND_BG },
      columnStyles:     { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin:           { left: 14, right: 14 },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Sección: Top platos ──────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('Platos más pedidos', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Plato', 'Unidades']],
    body: data.platosTop.length > 0
      ? data.platosTop.map((p, i) => [String(i + 1), p.nombre, String(p.unidades)])
      : [['—', 'Sin datos', '—']],
    styles:           { fontSize: 8.5, cellPadding: 3 },
    headStyles:       { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GREEN_BG },
    columnStyles:     { 0: { cellWidth: 12, halign: 'center' }, 2: { halign: 'center', cellWidth: 25 } },
    margin:           { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Sección: Tipos de pedido ─────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('Tipos de pedido', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Tipo', 'Pedidos', '% Total', 'Ventas']],
    body: data.tipos.length > 0
      ? data.tipos.map((t) => [t.tipo, String(t.pedidos), `${t.porcentaje}%`, `$${t.total.toLocaleString('es-CO')}`])
      : [['Sin datos', '—', '—', '—']],
    styles:           { fontSize: 8.5, cellPadding: 3 },
    headStyles:       { fillColor: BRAND, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BRAND_BG },
    columnStyles:     { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin:           { left: 14, right: 14 },
  });

  // ── Pie de página ────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text('Operación Remi', 14, 291);
    doc.text(`Pág. ${i} / ${pageCount}`, 196, 291, { align: 'right' });
    if (i > 1) {
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, 210, 5, 'F');
    }
  }

  const filename = `remi_stats_${data.periodoLabel.replace(/[\s–/]/g, '_').toLowerCase()}.pdf`;
  doc.save(filename);
}

// Helpers para que el componente pueda mostrar los colores de sección
export { colNum };
