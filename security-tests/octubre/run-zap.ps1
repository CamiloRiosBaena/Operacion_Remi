# Ejecuta OWASP ZAP en Docker con zap-plan.yaml y deja los reportes en la carpeta indicada.
param([string]$Salida = 'antes')
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $aqui $Salida
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item (Join-Path $aqui 'zap-plan.yaml') $out -Force
Write-Host "== OWASP ZAP - Operacion Remi - escaneo $Salida ==" -ForegroundColor Cyan
docker run --rm -v "${out}:/zap/wrk/:rw" zaproxy/zap-stable zap.sh -cmd -autorun /zap/wrk/zap-plan.yaml
Write-Host "== Fin. Reporte: $out\zap-reporte.html ==" -ForegroundColor Cyan
