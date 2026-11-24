@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "try { $null = Invoke-WebRequest 'http://127.0.0.1:8788/api/ping' -UseBasicParsing -TimeoutSec 2; Start-Process 'http://127.0.0.1:8788/tools/style_converter.html'; exit 0 } catch { exit 1 }"
if %errorlevel%==0 exit /b 0
node tools\server.js --port 8788 --style
pause
