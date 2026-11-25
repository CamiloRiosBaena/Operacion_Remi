# Menu para repetir las pruebas del documento de Operacion Remi en cualquier PC con Docker Desktop, Node.js 22 y Java.
# Uso: doble clic en ejecutar-pruebas.bat, o en PowerShell:  powershell -ExecutionPolicy Bypass -File .\ejecutar-pruebas.ps1
# Las opciones estan ordenadas por las secciones del documento. Instrucciones y parametros: PRUEBAS.md
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'pruebas\comun.ps1')
$met = Join-Path $Repo 'metricas-externas'
$fia = Join-Path $Repo 'reliability-tests'
$ren = Join-Path $Repo 'perf-tests\octubre'
$zap = Join-Path $Repo 'security-tests\octubre'
$RamGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
$script:ModoBackend = $null

function Instalar([string]$Carpeta) {
  if (-not (Test-Path (Join-Path $Carpeta 'node_modules'))) {
    Write-Host "Instalando dependencias en $Carpeta ..." -ForegroundColor Cyan
    Push-Location $Carpeta; npm ci; Pop-Location
  }
}

function Backend-Listo([string]$Modo = 'prueba') {
  # prueba: base de datos de prueba en Docker con la semilla. real: backend\.env (Supabase y cuentas reales).
  if (Puerto-Abierto 3000) {
    if ($script:ModoBackend -and $script:ModoBackend -ne $Modo) {
      throw "Hay un backend '$($script:ModoBackend)' abierto y esta prueba necesita el backend '$Modo'. Cierra la ventana del backend y vuelve a elegir la opcion."
    }
    Write-Host 'El backend ya esta corriendo en el puerto 3000.' -ForegroundColor Green; return
  }
  if ($Modo -eq 'real') {
    if (-not (Test-Path (Join-Path $Repo 'backend\.env'))) { throw 'Esta prueba necesita backend\.env (claves de Supabase). Copialo desde la USB.' }
    Abrir-Ventana 'Backend real (Remi)' "& '$Repo\pruebas\backend-real.ps1'"
  } else {
    Abrir-Ventana 'Backend de prueba (Remi)' "& '$met\backend-prueba.ps1'"
  }
  Write-Host "Abriendo el backend ($Modo) en otra ventana; no la cierres..." -ForegroundColor Cyan
  if (-not (Esperar-Puerto 3000 300)) { throw 'El backend no arranco en 5 minutos. Revisa su ventana.' }
  $script:ModoBackend = $Modo
  Start-Sleep 3
  Write-Host 'Backend listo en http://localhost:3000' -ForegroundColor Green
}

function Frontend-Listo([int]$Puerto = 3001, [switch]$Compilado) {
  if (Puerto-Abierto $Puerto) { return }
  if (-not (Test-Path (Join-Path $Repo 'frontend\.env'))) { throw 'Esta prueba necesita frontend\.env (claves de Supabase). Copialo desde la USB.' }
  Instalar (Join-Path $Repo 'frontend')
  if ($Compilado) { Abrir-Ventana 'Frontend compilado (Remi)' "cd frontend; npm run build; npm run preview -- --port $Puerto --host" }
  else { Abrir-Ventana 'Frontend (Remi)' "cd frontend; npm run dev -- --port $Puerto" }
  if (-not (Esperar-Puerto $Puerto 300)) { throw 'El frontend no arranco.' }
}

function Abrir-Chrome([string]$Url) {
  try { Start-Process chrome $Url } catch { Start-Process $Url }
}

function Abrir-JMeter([string]$Plan, [string]$Carpeta, [string[]]$Jtl, [string[]]$Props = @()) {
  $jmeter = Buscar-JMeter
  foreach ($j in $Jtl) { Remove-Item (Join-Path $Carpeta $j) -ErrorAction SilentlyContinue }
  Write-Host ''
  Write-Host 'Se abre JMeter. Para cambiar un parametro: clic en el nodo raiz del plan (el primero del arbol),' -ForegroundColor Yellow
  Write-Host 'tabla "User Defined Variables", escribir el nuevo numero en Value y luego Start (boton verde).' -ForegroundColor Yellow
  Write-Host 'Si JMeter pregunta por un archivo existente, elegir "Append" (nunca "Overwrite").' -ForegroundColor Yellow
  Write-Host 'Al terminar, la opcion H genera el dashboard HTML de la corrida.' -ForegroundColor Yellow
  $args_ = @('-t', "`"$Plan`"", "-Jcarpeta=`"$($Carpeta -replace '\\', '/')`"") + $Props
  Start-Process $jmeter -ArgumentList $args_ -WorkingDirectory (Split-Path $jmeter) | Out-Null
}

function Generar-Dashboard {
  $jtls = @(@(
    # g = granularidad de las graficas "over time" en ms (JMeter usa 60 s por defecto: una prueba de menos de un
    # minuto quedaria con un solo punto)
    @{ n = '2.5.2 Rendimiento'; f = Join-Path $ren 'resultados.jtl'; g = 1000 },
    @{ n = '2.5.5 Fiabilidad'; f = Join-Path $fia 'resultados.jtl'; g = 10000 },
    @{ n = '3.3.2 Capacidad'; f = Join-Path $met 'capacidad.jtl'; g = 5000 },
    @{ n = '3.3.6 Rafaga'; f = Join-Path $met 'rafaga.jtl'; g = 1000 }) | Where-Object { Test-Path $_.f })
  if (-not $jtls) { throw 'Todavia no hay resultados de JMeter. Corre primero una prueba de JMeter.' }
  for ($i = 0; $i -lt $jtls.Count; $i++) { Write-Host "  $($i + 1). $($jtls[$i].n)" }
  $k = [int](Read-Host 'Cual') - 1
  $jtl = $jtls[$k].f
  $salida = Join-Path (Split-Path $jtl) 'dashboard-corrida'
  Remove-Item $salida -Recurse -Force -ErrorAction SilentlyContinue
  & (Buscar-JMeter) -g "$jtl" -o "$salida" "-Jjmeter.reportgenerator.overall_granularity=$($jtls[$k].g)" | Out-Null
  Start-Process (Join-Path $salida 'index.html')
}

function Iniciar-Zap {
  docker info --format '{{.ServerVersion}}' *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker no esta encendido.' }
  # Siempre un contenedor nuevo: al reiniciar uno detenido, su pantalla virtual (Xvfb) no vuelve a arrancar.
  docker rm -f zap-gui *> $null
  docker run -d --name zap-gui -p 127.0.0.1:8080:8080 -v "$($zap -replace '\\', '/'):/zap/wrk:rw" zaproxy/zap-stable zap-webswing.sh | Out-Null
  Write-Host 'Esperando a que ZAP abra (1 a 2 minutos)...' -ForegroundColor Cyan
  for ($i = 0; $i -lt 90; $i++) {
    try { Invoke-WebRequest 'http://localhost:8080/zap/' -UseBasicParsing -TimeoutSec 3 | Out-Null; return } catch { Start-Sleep 2 }
  }
  throw 'ZAP no respondio en http://localhost:8080/zap/'
}

function Mostrar-Menu {
  Write-Host ''
  Write-Host "=========== PRUEBAS DE OPERACION REMI  (equipo con $RamGB GB de RAM) ===========" -ForegroundColor Cyan
  Write-Host '  0. Preparar este PC (dependencias, base de prueba y descarga de imagenes)'
  Write-Host '  D. Detener los contenedores de Docker (libera memoria entre pruebas)'
  Write-Host ' --- II. Pruebas del software ---' -ForegroundColor DarkCyan
  Write-Host '  1. 2.3    Unitarias ............................ Jest'
  Write-Host '  2. 2.4    Integracion incremental y por hilos .. Jest + PostgreSQL'
  Write-Host '  3. 2.5.1  Seguridad ............................ OWASP ZAP'
  Write-Host '  4. 2.5.2  Rendimiento (50 y 200 clientes) ...... JMeter'
  Write-Host '  5. 2.5.3  Usabilidad y accesibilidad ........... Lighthouse  (necesita los .env)'
  Write-Host '  6. 2.5.4  Portabilidad en 3 navegadores ........ Playwright  (necesita frontend\.env)'
  Write-Host '  7. 2.5.4  Instalacion en Linux ................. Docker'
  Write-Host '  8. 2.5.5  Fiabilidad con corte de la base ...... JMeter'
  Write-Host '  9. 2.5.6  Mantenibilidad ....................... SonarQube'
  Write-Host ' 10. 2.6    Aceptacion ........................... Selenium IDE (necesita los .env)'
  Write-Host ' --- III. Medicion del software ---' -ForegroundColor DarkCyan
  Write-Host ' 11. 3.2.1  Tamano del codigo .................... compilador de TypeScript'
  Write-Host ' 12. 3.2.2  Metricas orientadas a clases ......... script CK'
  Write-Host ' 13. 3.3.6  Barrido de seguridad de las rutas .... Jest (EISA y TEV-RBAC)'
  Write-Host ' 14. 3.3.2  Capacidad y recursos (5 escalones) ... JMeter + monitor'
  Write-Host ' 15. 3.3.6  Rafaga de ataque (TOMA) .............. JMeter'
  Write-Host ' 16. 3.3.7  Mantenibilidad con cobertura ......... SonarQube + Jest'
  Write-Host ' --- Otros ---' -ForegroundColor DarkCyan
  Write-Host '  H. Dashboard HTML de la ultima corrida de JMeter'
  Write-Host '  B. Levantar solo el backend de prueba (Swagger en http://localhost:3000/docs)'
  Write-Host '  S. Salir'
}

while ($true) {
  Mostrar-Menu
  $op = (Read-Host 'Opcion').Trim().ToUpper()
  try {
    switch ($op) {
      '0' {
        Instalar (Join-Path $Repo 'backend'); Instalar (Join-Path $Repo 'portability-tests')
        if (Test-Path (Join-Path $Repo 'frontend\.env')) { Instalar (Join-Path $Repo 'frontend') }
        Iniciar-Contenedor db remi-test-db
        $jm = Buscar-JMeter; Write-Host "JMeter: $jm" -ForegroundColor Green
        if ((Read-Host 'Descargar ahora las imagenes de ZAP, SonarQube y Linux (unos 9 GB, tarda)? S/N').ToUpper() -eq 'S') {
          foreach ($img in 'zaproxy/zap-stable', 'sonarqube:community', 'sonarsource/sonar-scanner-cli', 'node:22') {
            Write-Host "Descargando $img ..." -ForegroundColor Cyan; docker pull $img
          }
        }
        Write-Host 'Listo. Los navegadores de Playwright se descargan en la opcion 6, que es la unica que los usa.' -ForegroundColor Green
      }
      'D' {
        foreach ($c in 'sonarqube', 'zap-gui', 'remi-test-db') { docker stop $c 2>$null | Out-Null }
        Write-Host 'Contenedores detenidos. Cierra tambien las ventanas del backend y del frontend si estan abiertas.' -ForegroundColor Green
      }
      '1' { Instalar (Join-Path $Repo 'backend'); Push-Location (Join-Path $Repo 'backend'); npx jest --verbose; Pop-Location }
      '2' {
        Instalar (Join-Path $Repo 'backend'); Iniciar-Contenedor db remi-test-db
        Push-Location (Join-Path $Repo 'backend'); npx jest --config ./test/integracion/jest-integracion.json --runInBand --verbose; Pop-Location
      }
      '3' {
        Backend-Listo 'prueba'
        if (Test-Path (Join-Path $Repo 'frontend\.env')) { Frontend-Listo 4173 -Compilado }
        else { Write-Host 'Sin frontend\.env solo se escanea la API (el rastreo del frontend queda sin datos).' -ForegroundColor Yellow }
        New-Item -ItemType Directory -Force (Join-Path $zap 'corrida') | Out-Null  # ZAP no crea la carpeta del reporte
        $m = (Read-Host 'Con interfaz grafica (I) o automatico con reporte (A)? [I]').ToUpper()
        if ($m -eq 'A') {
          Write-Host 'Escaneando con ZAP (unos 5 a 15 minutos)...' -ForegroundColor Cyan
          docker run --rm -v "$($zap -replace '\\', '/'):/zap/wrk:rw" zaproxy/zap-stable zap.sh -cmd -autorun /zap/wrk/plan-demo.yaml
          Start-Process (Join-Path $zap 'corrida\zap-reporte.html')
        } else {
          Iniciar-Zap
          Start-Process 'http://localhost:8080/zap/'
          Write-Host 'En ZAP: menu Tools > Automation (o la pestana Automation abajo) > Load Plan...' -ForegroundColor Yellow
          Write-Host '        abrir /zap/wrk/plan-demo.yaml y presionar Run Plan. Las alertas salen en la pestana Alerts.' -ForegroundColor Yellow
          Write-Host '        El reporte queda en security-tests\octubre\corrida\zap-reporte.html' -ForegroundColor Yellow
        }
      }
      '4' {
        Backend-Listo 'prueba'
        Abrir-JMeter (Join-Path $ren 'remi-rendimiento.jmx') $ren @('resultados.jtl')
        Write-Host 'Resultados: perf-tests\octubre\resultados.jtl' -ForegroundColor Green
      }
      '5' {
        Backend-Listo 'real'; Frontend-Listo 3001
        Abrir-Chrome 'http://localhost:3001'
        Write-Host 'En Chrome: F12 > pestana Lighthouse > categoria Accessibility, dispositivo Mobile, modo Navigation > Analyze.' -ForegroundColor Yellow
        Write-Host 'Pantallas del documento: /, /menu?mesa=1, /registro, /login y, con sesion de administrador, /admin/menu.' -ForegroundColor Yellow
      }
      '6' {
        Backend-Listo 'prueba'; Frontend-Listo 3001
        Instalar (Join-Path $Repo 'portability-tests')
        Push-Location (Join-Path $Repo 'portability-tests')
        if ((Read-Host 'Descargar o verificar los navegadores de Playwright (Chromium, Firefox y WebKit, unos 500 MB)? S/N [N]').ToUpper() -eq 'S') {
          # Uno por uno y con el detalle de la descarga, para ver en cual va. Si se corta, se puede repetir: retoma lo que falte.
          $env:DEBUG = 'pw:install'
          foreach ($nav in 'chromium', 'firefox', 'webkit') {
            Write-Host "== Navegador: $nav ==" -ForegroundColor Cyan
            npx playwright install $nav
          }
          Remove-Item Env:DEBUG
        }
        & .\abrir-ui.ps1
        Pop-Location
      }
      '7' {
        Write-Host 'Instala y compila todo desde cero en un contenedor Linux (5 a 15 minutos)...' -ForegroundColor Cyan
        & (Join-Path $Repo 'portability-tests\instalacion\ejecutar.ps1') -Nombre 'remi-instalacion'
        Write-Host 'Los logs quedan en Docker Desktop, contenedor remi-instalacion.' -ForegroundColor Green
      }
      '8' {
        Backend-Listo 'prueba'
        $dur = Read-Host 'Duracion de la prueba en segundos (Enter = 600)'
        if (-not $dur) { $dur = 600 }
        $corte = Read-Host 'Segundo en que se apaga la base de datos (Enter = 240)'
        if (-not $corte) { $corte = 240 }
        Remove-Item (Join-Path $fia 'resultados.jtl') -ErrorAction SilentlyContinue
        Abrir-Ventana 'Corte de la base y memoria' "& '$fia\corte-y-memoria.ps1' -CorteSegundo $corte -Total $([int]$dur + 40)"
        Abrir-JMeter (Join-Path $fia 'remi-fiabilidad.jmx') $fia @('resultados.jtl') @("-Jduracion=$dur")
        Write-Host "La prueba dura $dur s; la base se apaga en el segundo $corte durante 30 s." -ForegroundColor Green
      }
      '9' {
        Instalar (Join-Path $Repo 'backend'); Iniciar-Contenedor sonarqube sonarqube
        Write-Host 'SonarQube en http://localhost:9000 (la primera vez: admin / admin y crear un token).' -ForegroundColor Yellow
        & (Join-Path $Repo 'maintainability-tests\analizar.ps1') -Version 'demostracion'
        Start-Process 'http://localhost:9000/dashboard?id=operacion-remi'
      }
      '10' {
        Backend-Listo 'real'; Frontend-Listo 3001
        Abrir-Chrome 'http://localhost:3001/login'
        Write-Host '1. Inicia sesion con la cuenta del administrador.' -ForegroundColor Yellow
        Write-Host '2. Abre la extension Selenium IDE > Open an existing project > acceptance-tests\remi-aceptacion.side' -ForegroundColor Yellow
        Write-Host '3. Run all tests. La suite borra sus propios datos al terminar.' -ForegroundColor Yellow
      }
      '11' {
        Instalar (Join-Path $Repo 'backend')
        Push-Location (Join-Path $Repo 'backend'); npx tsc -p tsconfig.build.json --noEmit --extendedDiagnostics | Select-String 'Files:|Lines of'; Pop-Location
        if (Test-Path (Join-Path $Repo 'frontend\node_modules')) {
          Push-Location (Join-Path $Repo 'frontend'); npx tsc -p tsconfig.app.json --noEmit --extendedDiagnostics | Select-String 'Files:|Lines of'; Pop-Location
        } else { Write-Host 'Para el frontend instala sus dependencias (opcion 0 con frontend\.env, o npm ci en frontend).' -ForegroundColor Yellow }
      }
      '12' { Instalar (Join-Path $Repo 'backend'); node (Join-Path $Repo 'metrics\metricas-clases.js'); Write-Host 'Detalle: metrics\metricas-clases.json' -ForegroundColor Green }
      '13' {
        Instalar (Join-Path $Repo 'backend'); Iniciar-Contenedor db remi-test-db
        Push-Location (Join-Path $Repo 'backend')
        npx jest --config ./test/integracion/jest-integracion.json --testRegex 'sec-spec.ts$' --runInBand --verbose
        Write-Host 'Detalle por ruta: backend\test\integracion\seguridad-rutas.json' -ForegroundColor Green
        Pop-Location
      }
      '14' {
        Backend-Listo 'prueba'
        $props = @()
        $limitado = 'N'
        if ($RamGB -lt 12) {
          $limitado = (Read-Host "Este equipo tiene $RamGB GB. Usar escalones reducidos 50, 100, 200, 400 y 800 clientes? S/N [S]").ToUpper()
          if (-not $limitado) { $limitado = 'S' }
        }
        if ($limitado -eq 'S') { $props = @('-Jclientes1=50', '-Jclientes2=100', '-Jclientes3=200', '-Jclientes4=400', '-Jclientes5=800') }
        Remove-Item (Join-Path $met 'recursos.csv') -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $met 'capacidad.jtl') -ErrorAction SilentlyContinue
        Abrir-Ventana 'Monitor de recursos' "& '$met\recursos.ps1'"
        Abrir-JMeter (Join-Path $met 'remi-capacidad.jmx') $met @('capacidad.jtl') $props
        Write-Host 'Resultados: metricas-externas\capacidad.jtl y recursos.csv' -ForegroundColor Green
      }
      '15' { Backend-Listo 'prueba'; Abrir-JMeter (Join-Path $met 'remi-rafaga.jmx') $met @('rafaga.jtl') }
      '16' { & (Join-Path $met 'mantenibilidad.ps1'); Start-Process 'http://localhost:9000/dashboard?id=operacion-remi' }
      'H' { Generar-Dashboard }
      'B' { Backend-Listo 'prueba' }
      'S' { exit }
      default { Write-Host 'Opcion no valida.' -ForegroundColor Red }
    }
  } catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  }
}
