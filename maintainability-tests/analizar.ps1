# Analiza Operación Remi con SonarQube (localhost:9000) usando sonar-scanner en Docker.
# Pide el token de análisis de forma oculta; el token no se guarda en ningún archivo.
param([string]$Version = 'octubre')

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path -replace '\\', '/'
$seguro = Read-Host -AsSecureString 'Token de análisis de SonarQube'
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))

Write-Host "== SonarQube - Operacion Remi - analisis '$Version' ==" -ForegroundColor Cyan
docker run --rm `
  -e SONAR_HOST_URL=http://host.docker.internal:9000 `
  -e SONAR_TOKEN=$token `
  -v "${repo}:/usr/src" `
  sonarsource/sonar-scanner-cli `
  "-Dsonar.projectVersion=$Version"
$token = $null
Write-Host "== Fin. Revisa el proyecto en http://localhost:9000/dashboard?id=operacion-remi ==" -ForegroundColor Cyan
