# Utilización de recursos (sección 3.3): registra la CPU y la memoria del proceso del backend (puerto 3000)
# cada 2 segundos mientras JMeter escribe capacidad.jtl, y termina cuando el archivo deja de crecer 20 s.
param([string]$Jtl = 'capacidad.jtl', [int]$Intervalo = 2)
$aqui = $PSScriptRoot
$jtlRuta = Join-Path $aqui $Jtl
$salida = Join-Path $aqui 'recursos.csv'
$nucleos = [Environment]::ProcessorCount

$pidBackend = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Select-Object -First 1
if (-not $pidBackend) { Write-Host 'No hay backend escuchando en el puerto 3000.' -ForegroundColor Red; exit 1 }
'momento,segundo,cpu_backend_nucleo_pct,cpu_backend_equipo_pct,memoria_mb,cpu_equipo_pct' | Set-Content $salida -Encoding utf8
Write-Host "Backend PID $pidBackend, $nucleos nucleos. Esperando a que JMeter empiece..." -ForegroundColor Cyan

while (-not (Test-Path $jtlRuta)) { Start-Sleep -Milliseconds 500 }
$inicio = Get-Date
$proc = Get-Process -Id $pidBackend
$cpuAntes = $proc.TotalProcessorTime.TotalSeconds; $tAntes = Get-Date
$tamano = (Get-Item $jtlRuta).Length; $sinCambio = 0
while ($sinCambio -lt 20) {
  Start-Sleep -Seconds $Intervalo
  $proc.Refresh()
  $ahora = Get-Date
  # Node.js atiende las peticiones en un solo hilo: el % sobre un núcleo muestra si el backend se satura
  $nucleo = ($proc.TotalProcessorTime.TotalSeconds - $cpuAntes) / ($ahora - $tAntes).TotalSeconds * 100
  $cpu = $nucleo / $nucleos
  $cpuAntes = $proc.TotalProcessorTime.TotalSeconds; $tAntes = $ahora
  $mb = [math]::Round($proc.WorkingSet64 / 1MB, 1)
  $equipo = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
  $s = [int]($ahora - $inicio).TotalSeconds
  "$($ahora.ToString('o')),$s,$([math]::Round($nucleo, 1)),$([math]::Round($cpu, 1)),$mb,$equipo" | Add-Content $salida
  Write-Host ("{0,4} s  CPU backend {1,5:N1} % de un nucleo ({2,4:N1} % del equipo)  memoria {3,6:N1} MB  CPU equipo {4,3} %" -f $s, $nucleo, $cpu, $mb, $equipo)
  $nuevo = (Get-Item $jtlRuta).Length
  if ($nuevo -eq $tamano) { $sinCambio += $Intervalo } else { $sinCambio = 0; $tamano = $nuevo }
}
Write-Host "Monitoreo terminado: $salida" -ForegroundColor Green
