# Levanta el backend compilado en localhost:3000 contra la base de datos de PRUEBA (Docker remi-test-db),
# en modo produccion, con la semilla de metricas-externas/semilla-prueba.sql.
# Si existe backend/.env se usan sus claves (Supabase, Groq, Mercado Pago); si no, se usan valores de prueba:
# el menu, las promociones y las rutas publicas funcionan igual, que es lo que consultan JMeter y Playwright.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\pruebas\comun.ps1')
$backend = Join-Path $Repo 'backend'

Iniciar-Contenedor db remi-test-db
docker cp (Join-Path $PSScriptRoot 'semilla-prueba.sql') remi-test-db:/tmp/semilla-prueba.sql | Out-Null
Push-Location $backend
if (-not (Test-Path 'node_modules')) { npm ci }
npm run build
# La primera vez la base esta vacia: el backend crea las tablas al arrancar y despues se carga la semilla.
$env:DB_HOST = 'localhost'; $env:DB_PORT = '55432'; $env:DB_NAME = 'remi_test'
$env:DB_USER = 'postgres'; $env:DB_PASSWORD = 'remi_test'; $env:DB_SSL = 'false'
$env:DB_POOL_MAX = '20'
if (-not (Test-Path '.env')) {
  Write-Host 'No hay backend\.env: se usan claves de prueba (las rutas publicas funcionan igual).' -ForegroundColor Yellow
  $env:SUPABASE_URL = 'https://proyecto-de-prueba.supabase.co'; $env:SUPABASE_ANON_KEY = 'clave-de-prueba'
  $env:SUPABASE_SERVICE_ROLE = 'clave-de-prueba'; $env:GROQ_API_KEY = 'clave-de-prueba'
  $env:JWT_SECRET = 'secreto-de-prueba'; $env:APP_URL = 'http://localhost:3001'
}
$tablas = docker exec remi-test-db psql -U postgres -d remi_test -tAc "select count(*) from information_schema.tables where table_name='platos'"
if ($tablas.Trim() -eq '0') {
  Write-Host 'Base vacia: creando las tablas (primer arranque)...' -ForegroundColor Cyan
  $env:NODE_ENV = 'development'
  $p = Start-Process node -ArgumentList 'dist/main' -PassThru -NoNewWindow
  if (-not (Esperar-Puerto 3000 90)) { throw 'El backend no arranco para crear las tablas.' }
  Stop-Process -Id $p.Id -Force; Start-Sleep 2
}
docker exec remi-test-db psql -q -U postgres -d remi_test -f /tmp/semilla-prueba.sql
Write-Host 'Semilla cargada en remi-test-db.' -ForegroundColor Green
$env:NODE_ENV = 'production'
Write-Host 'Backend en http://localhost:3000 (Ctrl+C para detenerlo)' -ForegroundColor Cyan
node dist/main
Pop-Location
