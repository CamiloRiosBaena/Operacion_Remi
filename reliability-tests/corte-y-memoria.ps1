# F3 y monitoreo de la prueba de fiabilidad.
# Espera a que JMeter empiece a escribir resultados.jtl, apaga la base de datos de prueba
# al minuto 4 durante 30 s y registra la memoria del backend cada 10 s hasta el final.
param(
  [int]$CorteSegundo = 240,
  [int]$DuracionCorte = 30,
  [int]$Total = 640
)
$aqui = $PSScriptRoot
$jtl = Join-Path $aqui 'resultados.jtl'
$eventos = Join-Path $aqui 'eventos.csv'
$memoria = Join-Path $aqui 'memoria.csv'

$pidBackend = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Select-Object -First 1
'momento,evento' | Set-Content $eventos -Encoding utf8
'momento,segundo,memoria_mb' | Set-Content $memoria -Encoding utf8

while (-not (Test-Path $jtl)) { Start-Sleep -Milliseconds 500 }
$inicio = Get-Date
"$($inicio.ToString('o')),inicio de la prueba" | Add-Content $eventos

$cortada = $false; $restaurada = $false
while (((Get-Date) - $inicio).TotalSeconds -lt $Total) {
  $s = [int]((Get-Date) - $inicio).TotalSeconds
  if (-not $cortada -and $s -ge $CorteSegundo) {
    docker stop remi-test-db | Out-Null
    "$((Get-Date).ToString('o')),base de datos apagada" | Add-Content $eventos
    $cortada = $true
  }
  if ($cortada -and -not $restaurada -and $s -ge ($CorteSegundo + $DuracionCorte)) {
    docker start remi-test-db | Out-Null
    "$((Get-Date).ToString('o')),base de datos encendida" | Add-Content $eventos
    $restaurada = $true
  }
  $mb = [math]::Round((Get-Process -Id $pidBackend).WorkingSet64 / 1MB, 1)
  "$((Get-Date).ToString('o')),$s,$mb" | Add-Content $memoria
  Start-Sleep -Seconds 10
}
"$((Get-Date).ToString('o')),fin del monitoreo" | Add-Content $eventos
