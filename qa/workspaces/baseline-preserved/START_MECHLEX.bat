@echo off
setlocal
cd /d "%~dp0"
start "MechLex Local Server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0core\start-local-server.ps1"
endlocal
