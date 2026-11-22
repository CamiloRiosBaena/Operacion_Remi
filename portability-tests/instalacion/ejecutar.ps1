# Ejecuta la prueba de instalación en un contenedor Linux limpio (node:22).
# El contenedor queda en Docker Desktop con el nombre indicado para revisar sus logs.
param([string]$Nombre = 'remi-instalacion')
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path -replace '\\', '/'
docker rm -f $Nombre 2>$null | Out-Null
docker run --name $Nombre -v "${repo}:/origen:ro" node:22 bash /origen/portability-tests/instalacion/instalar.sh
Write-Host "Contenedor '$Nombre' terminado con código $LASTEXITCODE (0 = todos los pasos OK)."
