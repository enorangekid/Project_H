@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Project_H save server (Ctrl+C or close this window to stop)
node tools/server.js --open
pause
