# Menu para ejecutar las pruebas de Operacion Remi en cualquier PC con Docker Desktop, Node.js 22 y Java 17 o mas.
# Uso: doble clic en ejecutar-pruebas.bat, o en PowerShell:  powershell -ExecutionPolicy Bypass -File .\ejecutar-pruebas.ps1
# Instrucciones completas y parametros que se pueden cambiar: PRUEBAS.md
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'pruebas\comun.ps1')
$met = Join-Path $Repo 'metricas-externas'
$fia = Join-Path $Repo 'reliability-tests'

function Instalar([string]$Carpeta) {
  if (-not (Test-Path (Join-Path $Carpeta 'node_modules'))) {
    Write-Host "Instalando dependencias en $Carpeta ..." -ForegroundColor Cyan
    Push-Location $Carpeta; npm ci; Pop-Location
  }
}

function Backend-Listo {
  if (Puerto-Abierto 3000) { Write-Host 'El backend ya esta corriendo en el puerto 3000.' -ForegroundColor Green; return }
  Write-Host 'Abriendo el backend de prueba en otra ventana (no la cierres)...' -ForegroundColor Cyan
  Abrir-Ventana 'Backend de prueba (Remi)' "& '$met\backend-prueba.ps1'"
  if (-not (Esperar-Puerto 3000 300)) { throw 'El backend no arranco en 5 minutos. Revisa la ventana del backend.' }
  Start-Sleep 3
  Write-Host 'Backend listo en http://localhost:3000' -ForegroundColor Green
}

function Abrir-JMeter([string]$Plan, [string]$Carpeta, [string[]]$Jtl) {
  $jmeter = Buscar-JMeter
  foreach ($j in $Jtl) { Remove-Item (Join-Path $Carpeta $j) -ErrorAction SilentlyContinue }
  Write-Host ''
  Write-Host 'Se abre JMeter. Para cambiar un parametro: clic en el nodo raiz del plan (el primero del arbol),' -ForegroundColor Yellow
  Write-Host 'tabla "User Defined Variables", cambiar el Value (por ejemplo 200 por 50) y luego Start (boton verde).' -ForegroundColor Yellow
  Write-Host 'Si JMeter pregunta por un archivo existente, elegir "Append" (nunca "Overwrite").' -ForegroundColor Yellow
  Start-Process $jmeter -ArgumentList '-t', "`"$Plan`"", "-Jcarpeta=`"$($Carpeta -replace '\\', '/')`"" -WorkingDirectory (Split-Path $jmeter) | Out-Null
}

function Mostrar-Menu {
  Write-Host ''
  Write-Host '================ PRUEBAS DE OPERACION REMI ================' -ForegroundColor Cyan
  Write-Host '  0. Preparar este PC (dependencias y contenedores de Docker)'
  Write-Host '  1. Pruebas unitarias (Jest, 148 pruebas)'
  Write-Host '  2. Pruebas de integracion (Jest + PostgreSQL, 62 pruebas)'
  Write-Host '  3. Barrido de seguridad de las 66 rutas (EISA y TEV-RBAC)'
  Write-Host '  4. Capacidad, tiempo de respuesta y recursos (JMeter + monitor)'
  Write-Host '  5. Rafaga de ataque (JMeter, metrica TOMA)'
  Write-Host '  6. Fiabilidad con corte de la base de datos (JMeter, 10 min)'
  Write-Host '  7. Mantenibilidad con cobertura (SonarQube)'
  Write-Host '  8. Metricas orientadas a clases (CK)'
  Write-Host '  9. Portabilidad en Chrome, Firefox y Safari (Playwright)'
  Write-Host '  B. Solo levantar el backend de prueba'
  Write-Host '  S. Salir'
}

while ($true) {
  Mostrar-Menu
  $op = (Read-Host 'Opcion').Trim().ToUpper()
  try {
    switch ($op) {
      '0' {
        Instalar (Join-Path $Repo 'backend'); Instalar (Join-Path $Repo 'portability-tests')
        Iniciar-Contenedor db remi-test-db
        Write-Host 'Descargando SonarQube (solo se necesita para la opcion 7; puede tardar)...' -ForegroundColor Cyan
        Iniciar-Contenedor sonarqube sonarqube
        docker pull sonarsource/sonar-scanner-cli | Out-Null
        $jm = Buscar-JMeter; Write-Host "JMeter: $jm" -ForegroundColor Green
        Write-Host 'Listo. Si vas a usar la opcion 9, ejecuta tambien: cd portability-tests; npx playwright install' -ForegroundColor Green
      }
      '1' { Instalar (Join-Path $Repo 'backend'); Push-Location (Join-Path $Repo 'backend'); npx jest; Pop-Location }
      '2' {
        Instalar (Join-Path $Repo 'backend'); Iniciar-Contenedor db remi-test-db
        Push-Location (Join-Path $Repo 'backend'); npm run test:integracion; Pop-Location
      }
      '3' {
        Instalar (Join-Path $Repo 'backend'); Iniciar-Contenedor db remi-test-db
        Push-Location (Join-Path $Repo 'backend')
        npx jest --config ./test/integracion/jest-integracion.json --testRegex 'sec-spec.ts$' --runInBand --verbose
        Write-Host 'Detalle por ruta: backend\test\integracion\seguridad-rutas.json' -ForegroundColor Green
        Pop-Location
      }
      '4' {
        Backend-Listo
        Remove-Item (Join-Path $met 'recursos.csv') -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $met 'capacidad.jtl') -ErrorAction SilentlyContinue
        Abrir-Ventana 'Monitor de recursos' "& '$met\recursos.ps1'"
        Abrir-JMeter (Join-Path $met 'remi-capacidad.jmx') $met @('capacidad.jtl')
        Write-Host 'Resultados: metricas-externas\capacidad.jtl y recursos.csv' -ForegroundColor Green
      }
      '5' {
        Backend-Listo
        Abrir-JMeter (Join-Path $met 'remi-rafaga.jmx') $met @('rafaga.jtl')
      }
      '6' {
        Backend-Listo
        $dur = Read-Host 'Duracion de la prueba en segundos (Enter = 600; debe coincidir con DURACION_S en JMeter)'
        if (-not $dur) { $dur = 600 }
        $corte = Read-Host 'Segundo en que se apaga la base de datos (Enter = 240)'
        if (-not $corte) { $corte = 240 }
        Remove-Item (Join-Path $fia 'resultados.jtl') -ErrorAction SilentlyContinue
        Abrir-Ventana 'Corte de la base y memoria' "& '$fia\corte-y-memoria.ps1' -CorteSegundo $corte -Total $([int]$dur + 40)"
        Abrir-JMeter (Join-Path $fia 'remi-fiabilidad.jmx') $fia @('resultados.jtl')
        Write-Host "Dentro de JMeter pon DURACION_S = $dur si lo cambiaste." -ForegroundColor Yellow
      }
      '7' { & (Join-Path $met 'mantenibilidad.ps1') }
      '8' { Instalar (Join-Path $Repo 'backend'); node (Join-Path $Repo 'metrics\metricas-clases.js'); Write-Host 'Detalle: metrics\metricas-clases.json' -ForegroundColor Green }
      '9' {
        Backend-Listo
        if (-not (Puerto-Abierto 3001)) {
          Instalar (Join-Path $Repo 'frontend')
          if (-not (Test-Path (Join-Path $Repo 'frontend\.env'))) {
            Write-Host 'Falta frontend\.env (claves de Supabase). Copialo desde la USB y vuelve a intentar.' -ForegroundColor Red
            break
          }
          Abrir-Ventana 'Frontend (Remi)' 'cd frontend; npm run dev -- --port 3001'
          if (-not (Esperar-Puerto 3001 120)) { throw 'El frontend no arranco.' }
        }
        Instalar (Join-Path $Repo 'portability-tests')
        Push-Location (Join-Path $Repo 'portability-tests'); & .\abrir-ui.ps1; Pop-Location
      }
      'B' { Backend-Listo }
      'S' { exit }
      default { Write-Host 'Opcion no valida.' -ForegroundColor Red }
    }
  } catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  }
}
