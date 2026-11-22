/**
 * Normaliza la unidad de compra de los ingredientes a las únicas que acepta la API: Kg, Caja, Bulto.
 *
 * - 'kg' → 'Kg', 'caja' → 'Caja', 'bulto' → 'Bulto' (solo cambia el texto).
 * - Cualquier otra unidad (unidad, racimo, litro, paca…) se convierte a 'Kg' conservando
 *   los gramos totales en stock: stock_kg = stock × gramosPorUnidad / 1000 y gramosPorUnidad = 1000.
 *   Así las porciones disponibles de cada plato no cambian.
 *
 * Uso (desde backend/):
 *   node scripts/normalizar-unidades.js            → simulación, no modifica nada
 *   node scripts/normalizar-unidades.js --aplicar  → aplica los cambios en una transacción
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { Client } = require('pg');

const RENOMBRAR = { kg: 'Kg', caja: 'Caja', bulto: 'Bulto' };
const VALIDAS = ['Kg', 'Caja', 'Bulto'];

function plan(ing) {
  const unidad = ing.unidadCompra;
  if (VALIDAS.includes(unidad)) return null;
  const nueva = RENOMBRAR[unidad.toLowerCase()];
  if (nueva) return { unidadCompra: nueva, gramosPorUnidad: ing.gramosPorUnidad, stockUnidades: ing.stockUnidades };
  const gramosTotales = Number(ing.stockUnidades) * Number(ing.gramosPorUnidad);
  return {
    unidadCompra: 'Kg',
    gramosPorUnidad: 1000,
    stockUnidades: Math.round((gramosTotales / 1000) * 100) / 100,
  };
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await db.connect();
  try {
    const { rows } = await db.query(
      'select id, nombre, "unidadCompra", "gramosPorUnidad", "stockUnidades" from ingredientes order by id',
    );
    const cambios = rows.map((ing) => ({ ing, nuevo: plan(ing) })).filter((c) => c.nuevo);
    for (const { ing, nuevo } of cambios) {
      console.log(
        `${ing.nombre}: ${ing.stockUnidades} ${ing.unidadCompra} × ${ing.gramosPorUnidad} g` +
          `  →  ${nuevo.stockUnidades} ${nuevo.unidadCompra} × ${nuevo.gramosPorUnidad} g`,
      );
    }
    console.log(`\n${cambios.length} de ${rows.length} ingredientes requieren cambio.`);
    if (!aplicar) {
      console.log('Simulación: no se modificó nada. Use --aplicar para guardar los cambios.');
      return;
    }
    await db.query('begin');
    for (const { ing, nuevo } of cambios) {
      await db.query(
        'update ingredientes set "unidadCompra" = $1, "gramosPorUnidad" = $2, "stockUnidades" = $3 where id = $4',
        [nuevo.unidadCompra, nuevo.gramosPorUnidad, nuevo.stockUnidades, ing.id],
      );
    }
    await db.query('commit');
    console.log('Cambios aplicados.');
  } catch (e) {
    await db.query('rollback').catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
