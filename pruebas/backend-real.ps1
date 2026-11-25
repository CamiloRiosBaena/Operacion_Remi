# Levanta el backend en localhost:3000 con backend\.env (base de datos y cuentas reales de Supabase).
# Lo necesitan las pruebas que inician sesion con las cuentas del restaurante: usabilidad (Lighthouse en el
# panel del administrador) y aceptacion (Selenium IDE). backend\.env no esta en el repositorio: se copia aparte.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'comun.ps1')
$backend = Join-Path $Repo 'backend'
if (-not (Test-Path (Join-Path $backend '.env'))) { throw 'Falta backend\.env. Copialo desde la USB a la carpeta backend.' }
Push-Location $backend
if (-not (Test-Path 'node_modules')) { npm ci }
npm run build
$env:NODE_ENV = 'production'
Write-Host 'Backend real (Supabase) en http://localhost:3000 (Ctrl+C para detenerlo)' -ForegroundColor Cyan
node dist/main
Pop-Location
