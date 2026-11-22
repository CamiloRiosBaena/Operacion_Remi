# Abre Playwright Test en modo UI (interfaz gráfica).
# En este equipo Windows, Chrome y Firefox de Playwright no cargan sus DLL desde
# %LOCALAPPDATA%\ms-playwright; la misma copia de los navegadores en otra carpeta sí funciona.
if (Test-Path 'C:\Users\PC\tools\pw-browsers') { $env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\PC\tools\pw-browsers' }
Set-Location $PSScriptRoot
npx playwright test --ui
