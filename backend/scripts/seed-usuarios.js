/**
 * Crea un usuario de cada rol (admin, cocinero, domiciliario, cliente):
 * uno en Supabase Auth y su fila correspondiente en Postgres (user_staff / clientes).
 *
 * Uso: node scripts/seed-usuarios.js   (ejecutar desde la carpeta backend/)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const STAFF = [
  { nombre: 'Admin Remi',      correo: 'admin@remi.local',      contrasena: 'Admin123!',    rol: 'admin' },
  { nombre: 'Cocina Remi',     correo: 'cocina@remi.local',     contrasena: 'Cocina123!',   rol: 'cocinero' },
  { nombre: 'Domicilios Remi', correo: 'domicilios@remi.local', contrasena: 'Domicilio123!', rol: 'domiciliario' },
];

const CLIENTE = { nombre: 'Cliente Demo', correo: 'cliente@remi.local', contrasena: 'Cliente123!' };

async function main() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'DB_HOST', 'DB_USER', 'DB_PASSWORD'];
  const faltantes = required.filter((k) => !process.env[k]);
  if (faltantes.length) {
    console.error(`Faltan variables en backend/.env: ${faltantes.join(', ')}`);
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await db.connect();

  const resumen = [];

  for (const u of STAFF) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.correo,
      password: u.contrasena,
      user_metadata: { nombre: u.nombre, rol: u.rol },
      email_confirm: true,
    });
    if (error) {
      console.error(`✗ ${u.correo}: ${error.message}`);
      continue;
    }
    await db.query(
      `INSERT INTO user_staff (supabase_uid, nombre, correo, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (correo) DO NOTHING`,
      [data.user.id, u.nombre, u.correo, u.rol],
    );
    resumen.push({ rol: u.rol, correo: u.correo, contrasena: u.contrasena });
  }

  const { data: clienteData, error: clienteError } = await supabase.auth.admin.createUser({
    email: CLIENTE.correo,
    password: CLIENTE.contrasena,
    user_metadata: { nombre: CLIENTE.nombre, rol: 'cliente' },
    email_confirm: true,
  });
  if (clienteError) {
    console.error(`✗ ${CLIENTE.correo}: ${clienteError.message}`);
  } else {
    await db.query(
      `INSERT INTO clientes (supabase_uid, nombre, correo)
       VALUES ($1, $2, $3)
       ON CONFLICT (correo) DO NOTHING`,
      [clienteData.user.id, CLIENTE.nombre, CLIENTE.correo],
    );
    resumen.push({ rol: 'cliente', correo: CLIENTE.correo, contrasena: CLIENTE.contrasena });
  }

  await db.end();

  console.log('\nUsuarios creados:');
  for (const r of resumen) {
    console.log(`  ${r.rol.padEnd(12)} ${r.correo.padEnd(24)} ${r.contrasena}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
