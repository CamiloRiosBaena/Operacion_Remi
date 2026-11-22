# Mantenibilidad (sección 3.3, métricas M1 a M5): genera la cobertura de Jest, analiza el código con
# SonarQube incluyendo esa cobertura y descarga las medidas por la API.
# Pide UN token de usuario de SonarQube (My Account > Security > Generate Token, tipo "User Token"),
# de forma oculta; el token no se guarda en ningún archivo.
$ErrorActionPreference = 'Stop'
$aqui = $PSScriptRoot
$repo = (Resolve-Path (Join-Path $aqui '..')).Path
$backend = Join-Path $repo 'backend'
$salida = Join-Path $aqui 'sonar'
New-Item -ItemType Directory -Force $salida | Out-Null

Write-Host '== 1. SonarQube ==' -ForegroundColor Cyan
. (Join-Path $repo 'pruebas\comun.ps1')
Iniciar-Contenedor sonarqube sonarqube
Iniciar-Contenedor db remi-test-db
if (-not (Test-Path (Join-Path $backend 'node_modules'))) { Push-Location $backend; npm ci; Pop-Location }
do { Start-Sleep 3; try { $st = (Invoke-RestMethod http://localhost:9000/api/system/status).status } catch { $st = '...' }; Write-Host "  estado: $st" } while ($st -ne 'UP')

Write-Host '== 2. Cobertura de las pruebas unitarias y de integracion ==' -ForegroundColor Cyan
Push-Location $backend
npx jest --coverage --coverageReporters=lcov --coverageReporters=text-summary
npx jest --config ./test/integracion/jest-cobertura.json --runInBand --coverage --coverageReporters=lcov --coverageReporters=text-summary
Pop-Location
# El escáner corre en Docker: las rutas del reporte deben ser relativas a la raíz del repositorio.
foreach ($lcov in @('coverage\lcov.info', 'coverage-integracion\lcov.info')) {
  $ruta = Join-Path $backend $lcov
  $lineas = foreach ($l in [IO.File]::ReadAllLines($ruta)) {
    if ($l.StartsWith('SF:')) { 'SF:backend/' + $l.Substring(3).Replace('\', '/') } else { $l }
  }
  [IO.File]::WriteAllLines($ruta, [string[]]$lineas)
}

$seguro = Read-Host -AsSecureString 'Token de usuario de SonarQube'
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))

Write-Host '== 3. Analisis con sonar-scanner ==' -ForegroundColor Cyan
$repoDocker = $repo -replace '\\', '/'
docker run --rm -e SONAR_HOST_URL=http://host.docker.internal:9000 -e SONAR_TOKEN=$token `
  -v "${repoDocker}:/usr/src" sonarsource/sonar-scanner-cli `
  '-Dsonar.projectVersion=metricas-noviembre' `
  '-Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,backend/coverage-integracion/lcov.info' `
  '-Dsonar.exclusions=**/node_modules/**,**/dist/**,**/*.spec.ts,**/coverage/**,**/coverage-integracion/**,**/test-mocks/**'

Write-Host '== 4. Esperando a que SonarQube procese el analisis ==' -ForegroundColor Cyan
$auth = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${token}:")) }
do { Start-Sleep 5; $cola = (Invoke-RestMethod 'http://localhost:9000/api/ce/component?component=operacion-remi' -Headers $auth); Write-Host "  en cola: $($cola.queue.Count)" } while ($cola.queue.Count -gt 0)

Write-Host '== 5. Descarga de medidas ==' -ForegroundColor Cyan
$base = 'http://localhost:9000/api'
$metricas = 'ncloc,files,functions,complexity,cognitive_complexity,code_smells,sqale_index,sqale_debt_ratio,sqale_rating,coverage,line_coverage,lines_to_cover,uncovered_lines'
Invoke-RestMethod "$base/measures/component?component=operacion-remi&metricKeys=$metricas" -Headers $auth |
  ConvertTo-Json -Depth 10 | Set-Content (Join-Path $salida 'proyecto.json') -Encoding utf8
foreach ($dir in @('backend/src', 'frontend/src')) {
  $nombre = ($dir -split '/')[0]
  Invoke-RestMethod "$base/measures/component?component=operacion-remi:$dir&metricKeys=$metricas" -Headers $auth |
    ConvertTo-Json -Depth 10 | Set-Content (Join-Path $salida "$nombre.json") -Encoding utf8
}
$archivos = @(); $p = 1
do {
  $r = Invoke-RestMethod "$base/measures/component_tree?component=operacion-remi&qualifiers=FIL&ps=500&p=$p&metricKeys=ncloc,functions,complexity,cognitive_complexity,code_smells,coverage" -Headers $auth
  $archivos += $r.components; $p++
} while ($archivos.Count -lt $r.paging.total)
$archivos | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $salida 'archivos.json') -Encoding utf8
Invoke-RestMethod "$base/issues/search?componentKeys=operacion-remi&rules=typescript:S3776,javascript:S3776&resolved=false&ps=500" -Headers $auth |
  ConvertTo-Json -Depth 10 | Set-Content (Join-Path $salida 's3776.json') -Encoding utf8
$token = $null
Write-Host "== Listo: medidas en $salida. Tablero: http://localhost:9000/dashboard?id=operacion-remi ==" -ForegroundColor Green
