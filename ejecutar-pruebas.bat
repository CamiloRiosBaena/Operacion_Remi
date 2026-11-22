@echo off
rem Abre el menu de pruebas de Operacion Remi sin cambiar la politica de ejecucion de PowerShell.
powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0ejecutar-pruebas.ps1"
