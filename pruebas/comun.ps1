# Funciones comunes de los guiones de pruebas de Operacion Remi. Se cargan con:  . "$repo\pruebas\comun.ps1"
$script:Repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Iniciar-Contenedor([string]$Servicio, [string]$Nombre) {
  # Arranca el contenedor si ya existe; si no, lo crea con docker compose.
  docker info --format '{{.ServerVersion}}' *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Docker no esta encendido. Abre Docker Desktop y espera a que diga "Engine running".' }
  $existe = docker ps -a --filter "name=^/$Nombre$" --format '{{.Names}}'
  if ($existe) { docker start $Nombre | Out-Null }
  else { docker compose -f (Join-Path $script:Repo 'docker-compose.yml') up -d $Servicio | Out-Null }
  if ($Servicio -eq 'db') {
    for ($i = 0; $i -lt 30; $i++) {
      docker exec $Nombre pg_isready -U postgres *> $null
      if ($LASTEXITCODE -eq 0) { return }
      Start-Sleep 1
    }
    throw 'La base de datos de prueba no respondio.'
  }
}

function Puerto-Abierto([int]$Puerto) {
  [bool](Get-NetTCPConnection -LocalPort $Puerto -State Listen -ErrorAction SilentlyContinue)
}

function Esperar-Puerto([int]$Puerto, [int]$Segundos = 120) {
  for ($i = 0; $i -lt $Segundos; $i++) { if (Puerto-Abierto $Puerto) { return $true }; Start-Sleep 1 }
  return $false
}

function Buscar-JMeter {
  # Devuelve la ruta de jmeter.bat: JMETER_HOME, la ruta guardada o una busqueda en carpetas comunes.
  $guardada = Join-Path $script:Repo 'pruebas\.jmeter-ruta'
  $candidatos = @()
  if ($env:JMETER_HOME) { $candidatos += Join-Path $env:JMETER_HOME 'bin\jmeter.bat' }
  if (Test-Path $guardada) { $candidatos += (Get-Content $guardada -Raw).Trim() }
  foreach ($c in $candidatos) { if ($c -and (Test-Path $c)) { return $c } }
  $raices = @("$HOME\tools", 'C:\tools', "$HOME\Downloads", "$HOME\Desktop", "$HOME\Documents", 'C:\', "$HOME\OneDrive\Desktop",
              "$HOME\OneDrive\Escritorio", "$HOME\Escritorio", "$HOME\Descargas", (Split-Path $script:Repo))
  foreach ($r in $raices) {
    if (-not (Test-Path $r)) { continue }
    $d = Get-ChildItem $r -Directory -Filter 'apache-jmeter*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($d) {
      $bat = Get-ChildItem $d.FullName -Recurse -Depth 2 -Filter 'jmeter.bat' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($bat) { Set-Content $guardada $bat.FullName; return $bat.FullName }
    }
  }
  $ruta = Read-Host 'No encontre JMeter. Pega la ruta de la carpeta apache-jmeter-5.6.3 (la que tiene bin)'
  $bat = Join-Path $ruta.Trim('"') 'bin\jmeter.bat'
  if (-not (Test-Path $bat)) { throw "No existe $bat" }
  Set-Content $guardada $bat
  return $bat
}

function Abrir-Ventana([string]$Titulo, [string]$Comando) {
  # Abre una ventana de PowerShell aparte que queda abierta (backend, monitor, frontend).
  $cmd = "`$host.UI.RawUI.WindowTitle = '$Titulo'; Set-Location '$script:Repo'; $Comando"
  Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $cmd | Out-Null
}
